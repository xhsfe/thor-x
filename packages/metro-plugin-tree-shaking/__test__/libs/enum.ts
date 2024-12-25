export enum AppLifeCycle {
  /** 应用启动阶段，registerComponent 成功，等待 runApplication */
  AppStart = 'appStart',
  /** 应用启动前的准备阶段，开始准备调用 runApplication */
  BeforeRunApplication = 'beforeRunApplication',
  /** 应用渲染阶段 */
  AppRender = 'appRender',
  /** 应用组件挂载完成阶段 */
  AppDidMount = 'appDidMount',
  /** 应用销毁阶段 */
  AppDestroy = 'appDestroy',
}

const AppLifecycleListener = {
  // onMessageQueue: (callback: (info: SpyData) => void) => DeviceEventEmitter.addListener(AppLifeCycle.MessageQueue, () => MessageQueue.spy(callback)),
  onStart: AppLifeCycle.AppStart,
  onBeforeRunApplication: AppLifeCycle.BeforeRunApplication,
  onRender: AppLifeCycle.AppRender,
  onDidMount: AppLifeCycle.AppDidMount,
  onDestroy: AppLifeCycle.AppDestroy,
}

export default AppLifecycleListener
