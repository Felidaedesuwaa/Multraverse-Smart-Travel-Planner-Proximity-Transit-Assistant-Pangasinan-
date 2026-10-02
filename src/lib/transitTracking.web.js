// Browsers cannot provide the native background location service.
export const getTransitSession = async () => null;
export const stopTransitAlarm = async () => {};
export const subscribeTransit = () => () => {};
export const startTransitAlarm = async () => { throw new Error('Background alarms require the installed mobile app.'); };
