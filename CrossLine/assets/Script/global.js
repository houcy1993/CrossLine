import EventListener from "./event-listener"

const global = global || {};
global.eventListener = EventListener({});

export default global;