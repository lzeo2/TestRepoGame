var isTouch = ('ontouchstart' in window) ||
  (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);

if (isTouch) {
  $(function () {
    $('#left-controls, #right-controls').css('display', 'flex');

    // keep page scrolling out of the way only while touching the controls
    $('#left-controls, #right-controls').bind('touchstart touchmove touchend', function (e) {
      if (e.type != 'touchend') {
        for (k in KEY_STATUS) {
          KEY_STATUS[k] = false;
        }
      }
      var touches = e.type == 'touchend' ? e.originalEvent.changedTouches : e.originalEvent.touches
      for (var i = 0; i < touches.length; i++) {
        var ele = document.elementFromPoint(touches[i].pageX, touches[i].pageY);
        if (ele && (ele.id in KEY_STATUS)) {
          KEY_STATUS[ele.id] = (e.type != 'touchend');
        }
      }
      e.preventDefault();
    });
  });
}
