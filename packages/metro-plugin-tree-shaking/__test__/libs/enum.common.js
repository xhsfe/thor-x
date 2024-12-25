/* eslint-disable */
"use strict";
// Welcome to the TypeScript Playground, this is a website
// which gives you a chance to write, share and learn TypeScript.
exports.ELongLinkState = exports.EMsgEvents = exports.EVENTS = exports.EAuthType = exports.EContentType = exports.ELonglinkAction = exports.EVirtualLinkHandleType = exports.ErrorCode = exports.EStatusMessage = exports.EStatusCodes = exports.EConnectType = exports.EEnv = exports.EErrorAvailable = exports.PUSH_BIZ_ID = void 0;
// You could think of it in three ways:
//
//  - A location to learn TypeScript where nothing can break
//  - A place to experiment with TypeScript syntax, and share the URLs with others
//  - A sandbox to experiment with different compiler features of TypeScript
// To learn more about the language, click above in "Examples" or "What's New".
// Otherwise, get started by removing these comments and the world is your playground.
var EErrorAvailable;
(function (EErrorAvailable) {
    // 可恢复
    EErrorAvailable["Available"] = "Available";
    // 不可恢复
    EErrorAvailable["UnAvailable"] = "UnAvailable";
    // 不属于长连层
    EErrorAvailable["Other"] = "Other";
    // 业务错误
    EErrorAvailable["Biz"] = "Biz";
})(EErrorAvailable = exports.EErrorAvailable || (exports.EErrorAvailable = {}));