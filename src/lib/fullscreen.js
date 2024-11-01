export default () => {
  const { document } = window;

  const requestFullScreen =
    document.documentElement.requestFullscreen ||
    document.documentElement.mozRequestFullScreen ||
    document.documentElement.webkitRequestFullScreen ||
    document.documentElement.msRequestFullscreen;
  const cancelFullScreen =
    document.exitFullscreen ||
    document.mozCancelFullScreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;

  if (
    !document.fullscreenElement &&
    !document.mozFullScreenElement &&
    !document.webkitFullscreenElement &&
    !document.msFullscreenElement
  ) {
    requestFullScreen.call(document.documentElement);
  } else {
    cancelFullScreen.call(document);
  }
};
