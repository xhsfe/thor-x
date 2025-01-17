const pureTime = /* @__PURE__ */ setTimeout(() => {
  // 获取 live 信息
  alert("I am side effect statement! Don't Shake me !");
  clearTimeout(time);
}, 100);

const time = setTimeout(() => {
  // 获取 live 信息
  alert("I am side effect statement! Don't Shake me !");
  clearTimeout(time);
}, 100);

const protectMe = {
  key: setTimeout(() => {
    // 获取 live 信息
    alert("I am side effect statement! Don't Shake me !");
  }, 100)
}

const shakeMe = {
  key: 'Please shake me'
}

// esbuild ClassCanBeRemovedIfUnused
// ExprCanBeRemovedIfUnused
// StmtsCanBeRemovedIfUnused