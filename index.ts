const express = require('express');

const { Queue, QueueEvents, Job } = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const { inspect } = require('util');

const flows = require('./flow');
const cache = require('./cache')();

const {FlowTask, FlowTaskInventory, Flow} = require('./objects');

const flowTaskInventory = new FlowTaskInventory();
const app = express();
app.use(express.json());
const port = 3000;

const getFlow = (id: string) => {
  // console.log('flows', flows);
  return flows.find(item => item.id === id);
}

cache.setConnections('test', getFlow('test').connections);

const queues = {
  validate: new Queue('validate'),
  httprequest: new Queue('httprequest'),
  log: new Queue('log'),
  select: new Queue('select'),
  email: new Queue('email'),
}

const qe = {
  validate: new QueueEvents('validate'),
  httprequest: new QueueEvents('httprequest'),
  log: new QueueEvents('log'),
  select: new QueueEvents('select'),
  email: new QueueEvents('email'),
}

const onCompleted = async (job) => {
  console.log('job:', job, 'completed');

  const data = job.returnvalue;
  const flowTaskId = FlowTask.getTaskIdFromQueueTaskId(job.jobId);
  const flowtask = flowTaskInventory.get(flowTaskId);

  const nextStep = flowtask.getNextStep(data);

  //console.log('flowtask', inspect(flowtask,{ showHidden: true, depth: null }));
  console.log('next step', nextStep);

  if(!nextStep) {
    console.log('flow end, no next step in flow');
    return;
  }
  
  const q = queues[nextStep.type];
  flowtask.setCurrentInput(data);
  const jobId = flowtask.getQueueTaskId();

  console.log({jobId, data})
  q.add(flowTaskId, {
    params: nextStep.params,
    data: job.returnvalue,
  }, {
    jobId
  });
}

for (const key in qe) {
  if (qe.hasOwnProperty(key)) {
    qe[key].on('completed', onCompleted);
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.post('/flow/:id', async (req, res) => {
  const flowId = req.params.id;
  const data = req.body;
  const flow = getFlow(flowId);

  if (!flow) {
    console.log('no flow', flowId);
    return;
  }

  const flowtask = new FlowTask(flow);

  flowtask.setCurrentInput(data);
  flowTaskInventory.add(flowtask);
  const flowTaskId = flowtask.getId();
  res.send(flowTaskId);

  const step = flowtask.getFirstStep();

  const q = queues.validate;
  q.add(flowTaskId, {
    params: step.params, 
    data
  }, {jobId: flowtask.getQueueTaskId()});
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});