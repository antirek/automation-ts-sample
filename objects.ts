const { v4: uuidv4 } = require('uuid');

export interface LogStep {
  id: string,
  type: string,
  params: {},
  input: {},
  output: {},
  nextStepId: string,
}

export interface IStep {
  id: string;
  type: string;
}

export interface IStepStart extends IStep {
  params: {},
  next: string,
  getNextStepId(): string;
  process(data: any | void): void;
}

export interface IStepExecutor extends IStep {
  params: {};
  next: string;
  process(data: any): void;  
  getNextStepId(): string;
}

export interface IStepSelector extends IStep {
  params: {},
  next: string;
  process(data: any): void;
  getNextStepId(): string;
}

export class StepStart implements IStepStart {
  id: string;
  type: string;
  params: {};
  next: string;

  constructor({id, type, params, next}: IStepStart) {
    this.id = id;
    this.type = type;
    this.params = params;
    this.next = next;
  }

  getNextStepId() {
    return this.next;
  }

  process(data: any | void) {
    return {nextStepId: this.next, result: data};
  }
}

export class ExecutorFactory {
  static createExecutor(executorName) {
    return {
      exec: (params, data) => {
        return {status: 'ok'}
      }
    }
  }
}

export class SelectorFactory {
  static createSelector(selectorName) {
    return {
      exec: (params, data) => {
        const nextId = 'next';
        return nextId;
      }
    }
  }
}


export class StepExecutor implements IStepExecutor {
  id: string;
  type: string;
  params: {};
  next: string;
  executor: {
    exec(params: object, data:string): object
  };

  constructor({id, type, params, executor, next}) {
    this.id = id;
    this.type = type;
    this.params = params;
    this.next = next;
    this.executor = ExecutorFactory.createExecutor(executor);
  }

  getNextStepId() {
    return this.next;
  }

  process(data) {
    return this.executor.exec(this.params, data);
  }
}

export class StepSelector implements IStepSelector {
  id: string;
  type: string;
  params: {};
  next: string;
  selector: {
    exec(params: object, data:string): string
  };

  constructor({id, type, params, selector}) {
    this.id = id;
    this.type = type;
    this.params = params;
    this.next = null;
    this.selector = SelectorFactory.createSelector(selector);
  }

  getNextStepId() {
    return this.next;
  }

  process(data) {
    this.next = this.selector.exec(this.params, data)
    return {next: this.next, data};
  }
}

export class StepFactory {
  static createStep(type, data) {
    switch (type){
      case 'start': 
        return new StepStart(data);
      case 'executor':
        return new StepExecutor(data);
      case 'selector': 
        return new StepSelector(data);
      default: 
        return null;
    }
  }
}


export interface Connection {
  id: string,
  uri: string,
}

export interface Flow {
  id: string,
  steps: IStep[],
  connections: Connection[],
}

export class FlowTask {
  id: string;
  flow: Flow;
  currentStepId: string;
  currentInput: object;
  currentResult: object;
  index: number;
  logSteps: LogStep[];
  status: string;
  vars: object;
  steps: {};
  nextStepId: string;

  constructor(flow) {
    this.id = uuidv4()
    this.flow = flow;
    this.index = 0;
    this.logSteps = [];
    this.status = 'init';
    this.vars = {};
    this.steps = this.createStepsFromFlow(flow);
    this.nextStepId = null;
  }

  private createStepsFromFlow (flow: Flow) {
    const steps = {};
    flow.steps.map(step => {
      steps[step.id] = StepFactory.createStep(step.type, step);
    })
    return steps;
  }

  getStep(stepId: string) {
    return this.steps[stepId];
  }

  getFirstStep() {
    this.currentStepId = 'start';
    this.status = 'start';
    this.index = 1;
    return this.getStep(this.currentStepId);
  }

  getCurrentStep() {
    if(!this.currentStepId) {
      return this.getFirstStep();
    }
    return this.getStep(this.currentStepId);
  }

  process(data) {
    if (data) {
      this.currentInput = data;
    }
    const currentStep = this.getCurrentStep();
    this.status = 'processing';
    const {nextStepId, result} = currentStep.process(this.currentInput, this.vars);
    this.status = 'wait';
    this.nextStepId = nextStepId;
    this.currentResult = result;
    this.index++;
    this.log();
  }

  log () {
    const currentStep = this.getCurrentStep();
    this.addLogStep({
      id: currentStep.id, 
      type: currentStep.type,
      params: currentStep.params,
      input: this.currentInput,
      output: this.currentResult,
      nextStepId: this.nextStepId,
    })
  }

  moveFlowToNextStep() {
    if (!this.nextStepId) {
      return false;
    }
    this.currentStepId = this.getStep(this.nextStepId).id;
    this.currentInput = this.currentResult;
    this.currentResult = null;
    this.nextStepId = null;
    return true;
  }

  addLogStep(obj: LogStep) {
    this.logSteps.push(obj);
  }

  getId() {
    return this.id;
  }

  getStatus() {
    return this.status;
  }

  setVar(variable: string, value: any) {
    this.vars[variable] = value;
  }

  getVar(variable: string) {
    return this.vars[variable];
  }

  getQueueTaskId() {
    return this.id + '%' + this.index + '%' + this.currentStepId;
  }

  static getTaskIdFromQueueTaskId(queueTaskId) {
    return queueTaskId.split('%')[0];
  }
}

export class FlowTaskInventory {
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

