
const {FlowTask, FlowTaskInventory, Flow} = require('./objects');

const flows = require('./flow');



const getFlow = (id: string) => {
  //  console.log('flows', flows);
  return flows.find(item => item.id === id);
}

const flow = getFlow('test');

const flowtask = new FlowTask(flow);

///console.log(flowtask);
const firstStep = flowtask.getFirstStep();

flowtask.process({erer:'qw'});
console.log('1', flowtask);


flowtask.moveFlowToNextStep();
flowtask.process();

console.log('2', flowtask);


flowtask.moveFlowToNextStep();
flowtask.process();

console.log('3', flowtask);

//console.log(firstStep, result);


/**
const secondStep = flowtask.getNextStep();

result = secondStep.process(result);

console.log(secondStep, result);


const thirdStep = flowtask.getNextStep();

result = thirdStep.process(result);

console.log(thirdStep, result);
 */