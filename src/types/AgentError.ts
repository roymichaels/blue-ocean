export default class AgentError extends Error {
  code: string;
  source: string;

  constructor(code: string, message: string, source: string) {
    super(message);
    this.code = code;
    this.source = source;
    this.name = 'AgentError';
  }
}
