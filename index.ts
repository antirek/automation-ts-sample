const express = require('express');

const { Queue, QueueEvents, Job } = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const { inspect } = require('util');

const flows = require('./flow');
const cache = require('./cache')();

class FlowTask {
  id: string;
  flow: Flow;
  currentStepId: string;
  currentInput: object;
  index: number;
  logSteps: LogStep[];

  constructor(flow) {
    this.id = uuidv4()
    this.flow = flow;
    this.index = 0;
    this.logSteps = [];
  }

  getStep(stepId: string) {
    if (!this.flow && !this.flow.steps) {
      return;
    }
    return this.flow.steps.find(step => step.id === stepId);
  }

  getFirstStep() {
    this.currentStepId = 'start';
    this.index = 1;
    return this.getStep(this.currentStepId);
  }

  getCurrentStep() {
    return this.getStep(this.currentStepId);
  }

  getNextStep(data: object): Step {
    const currentStep = this.getCurrentStep();
    if (!currentStep.next) {
      return;
    }
    const nextStepId = currentStep.next(data);
    if (!nextStepId) {
      console.log('no nextStepId on currentStepId:', currentStep.id, ', data:', data);
    }
    let nextStep = this.getStep(nextStepId);    

    this.addLogStep({
      id: currentStep.id, 
      type: currentStep.type,
      params: currentStep.params,
      input: this.currentInput,
      output: data,
      nextStepId: nextStep ? nextStep.id : null,
    })

    if (!nextStepId) {
      return;
    }

    this.index++;
    this.currentStepId = nextStep.id;
    return nextStep;
  }

  addLogStep(obj: LogStep) {
    this.logSteps.push(obj);
  }

  setCurrentInput(input: object) {
    this.currentInput = input;
  }

  getId() {
    return this.id;
  }

  getQueueTaskId() {
    return this.id + '%' + this.index + '%' + this.currentStepId;
  }

  static getTaskIdFromQueueTaskId(queueTaskId) {
    return queueTaskId.split('%')[0];
  }
}

class FlowTaskInventory {
  flowtasks: FlowTask[];
  constructor () {
    this.flowtasks = [];
  }

  add(flowtask: FlowTask) {
    this.flowtasks.push(flowtask);
  }

  get(id: string) {
    return this.flowtasks.find(ft => ft.getId() === id);
  }

  remove(id: string) {
    this.flowtasks;
  }
}

const flowTaskInventory = new FlowTaskInventory();

interface LogStep {
  id: string,
  type: string,
  params: {},
  input: {},
  output: {},
  nextStepId: string,
}

interface Step {
  id: string,
  type: string,
  params: {},
  next(data: object): string,
}

interface QueueTask {
  id: string,
  params: {},
  data: {},
}

interface Connection {
  id: string,
  uri: string,
}

interface Flow {
  id: string,
  steps: Step[],
  connections: Connection[],
}

interface BullJobResult {
  jobId: string,
  returnvalue: object,
}

const app = express();
app.use(express.json());
const port = 3000;

const getFlow = (id: string): Flow => {
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

const onCompleted = async (job: BullJobResult) => {
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
  q.add(flowTaskId, {params: step.params, data}, {jobId: flowtask.getQueueTaskId()});
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});