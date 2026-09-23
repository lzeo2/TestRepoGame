/*
 Source: https://github.com/astropanic/JIX
 License: MIT - commit c08594ec0423af2001a1a3904f745649e375dec8
 Modifications: see index.html header.
*/
var Graphics = function(){
  this.size = 3;
  this.canvas = document.getElementById("jix");
  this.ctx    = this.canvas.getContext('2d');
  this.offscreenCanvas = document.createElement('canvas');
  this.offscreenCanvas.width = 960;
  this.offscreenCanvas.height = 600;
  this.offscreenCanvas.context = this.offscreenCanvas.getContext('2d');
};

Graphics.prototype.sample = function(x, y){
  var data  = this.offscreenCanvas.context.getImageData(x-1, y-1, 1, 1).data;
  var red   = data[2];
  var green = data[1];
  var blue  = data[0];
  return "#"+(red + 256 * green + 65536 * blue).toString(16).toUpperCase();
};


Graphics.prototype.line = function(x1, y1, x2, y2, color){
  this.ctx.beginPath();
  this.ctx.strokeStyle = color;
  this.ctx.lineWidth=3;
  if(x1 != x2){
    var xmin = Math.min(x1, x2);
    var xmax = Math.max(x1, x2);
    this.ctx.moveTo(xmin*this.size, (y1)*this.size+1.5);
    this.ctx.lineTo(xmax*this.size+this.size, (y1)*this.size+1.5);
    this.ctx.stroke();
  } else {
    var ymin = Math.min(y1, y2);
    var ymax = Math.max(y1, y2);
    this.ctx.moveTo(x1*this.size+1.5, (ymin)*this.size);
    this.ctx.lineTo(x1*this.size+1.5, (ymax)*this.size+this.size);
    this.ctx.stroke();
  }
};
