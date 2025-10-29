var paintCVS = document.getElementById("paint-canvas");
var ctx = paintCVS.getContext("2d");
var zoom = document.getElementById("zoom");
var thickness = document.getElementById("thickness");
var area = document.getElementById("paint-area");
var color = document.getElementById("color");
var savepng = document.getElementById("save");
var width = document.getElementById("width");
var canvas = paintCVS;
var height = document.getElementById("height");
var loadimage = document.getElementById("load-image");
var erase = document.getElementById("erase");
var fillCVS = document.createElement("canvas");
var fctx = fillCVS.getContext("2d");
var modeB = document.getElementById("MODE");
var dot = document.getElementById("dot");
var newButton = document.getElementById("newButton");
var textValue = document.getElementById("textValue");
var transparent = document.getElementById("transparent");
var undoData = [];
var redoData = [];
var movePos2 = {
  action: -1,
};
var isShiftDown = false;
modeB.innerHTML = "brush";
ctx.imageSmoothingEnabled = false;

function updateZoom() {
  var scale = zoom.value / 100;
  paintCVS.style.width = `${paintCVS.width * scale}px`;
  paintCVS.style.height = `${paintCVS.height * scale}px`;
  paintCVS.style.backgroundSize = `${scale * 32}px ${scale * 32}px`;
  zoom.title = `Zoom: ${scale * 100}%`;
}
zoom.max = 2000;

savepng.onclick = function () {
  try {
    var a = document.createElement("a");
    a.download = "drawing.png";
    a.href = paintCVS.toDataURL("image/png");
    movePos2 = {
      action: -1,
    };
    a.click();
  } catch (e) {
    window.alert("Failed to save! " + e);
  }
};
loadimage.onclick = function () {
  var loadinput = document.createElement("input");
  loadinput.value = "";
  loadinput.accept = "image/*";
  loadinput.type = "file";
  loadinput.click();
  loadinput.onchange = function () {
    if (loadinput.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        var image = document.createElement("img");
        image.src = reader.result;

        setTimeout(() => {
          if (loadinput.files[0].type.split("/")[0] == "image") {
            ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
            zoom.value = 100;
            paintCVS.width = image.width;
            paintCVS.height = image.height;
            width.value = image.width;
            height.value = image.height;
            ctx.drawImage(image, 0, 0, paintCVS.width, paintCVS.height);
            updateZoom();
            changeMode("brush");
            undoData = [];
            redoData = [];
            if (
              loadinput.files[0].name.split(".").pop().toLowerCase() == "svg"
            ) {
              window.alert(".svg files will be forced into .pngs");
            }
          } else {
            window.alert("invalid file type!");
          }
          //movePos2 = {action:-1};
        }, 130);
      };
      reader.readAsDataURL(loadinput.files[0]);
    }
  };
};

var lastPos = {
  x: 0,
  y: 0,
};
window.currentMode = "brush";
paintCVS.style.cursor = "crosshair";
function fixSizeValues(value) {
  var number = Number(value.value);
  if (number < 1) {
    number = 1;
    value.value = number;
  }
  if (isNaN(number)) {
    number = 1;
    value.value = 1;
  }
  return number;
}
width.onchange = function () {
  var dat = ctx.getImageData(0, 0, paintCVS.width, paintCVS.height);
  paintCVS.width = fixSizeValues(width);
  updateZoom();
  changeMode("brush");
  ctx.putImageData(dat, 0, 0);
  //movePos2 = {action:-1};
};
height.onchange = function () {
  var dat = ctx.getImageData(0, 0, paintCVS.width, paintCVS.height);
  paintCVS.height = fixSizeValues(height);
  updateZoom();
  changeMode("brush");
  //movePos2 = {action:-1};
  ctx.putImageData(dat, 0, 0);
};
zoom.onchange = function () {
  updateZoom();
};
zoom.oninput = function () {
  updateZoom();
};

function changeMode(m) {
  currentMode = m;
  modeB.innerHTML = m;
  //window.alert(mode);
}
var down = false;
newButton.onclick = function () {
  if (window.confirm("New file?")) {
    paintCVS.width = 600;
    paintCVS.height = 360;
    ctx.clearRect(0, 0, 600, 360);
    width.value = 600;
    height.value = 360;
    updateZoom();
  }
};

function getMousePos(canvas, evt, scale) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(evt.clientX - rect.left),
    y: Math.round(evt.clientY - rect.top),
  };
}

function getTouchPos(canvas, evt, scale) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(evt.touches[0].clientX - rect.left),
    y: Math.round(evt.touches[0].clientY - rect.top),
  };
}
var pos = {
  x: 0,
  y: 0,
};
var rect = null;
var circle = null;
var mouse = true;

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function getDirectionFromPoints(ax, ay, bx, by) {
  var dx = ax - bx;
  var dy = ay - by;
  var direction = 90 - radToDeg(Math.atan2(dy, dx));
  return direction;
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function velocityInDir(steps, dir) {
  const radians = degToRad(90 - dir);
  const dx = steps * Math.cos(radians);
  const dy = steps * Math.sin(radians);
  return [dx, dy];
}

function betterLineto(sx, sy, x, y, thickness, color) {
  var lx = Math.round(sx);
  var ly = Math.round(sy);
  var m = 0;

  //To fix the fill, make the line pixelated.
  while (
    !(Math.round(x) == Math.round(lx) && Math.round(y) == Math.round(ly)) &&
    m < 3300
  ) {
    ctx.fillStyle = color;
    var dir = getDirectionFromPoints(x, y, lx, ly);
    var vel = velocityInDir(1, dir);
    ctx.fillRect(
      Math.round(lx - thickness / 2),
      Math.round(ly - thickness / 2),
      Math.round(thickness),
      Math.round(thickness)
    );
    lx += vel[0];
    ly += vel[1];
    ctx.fillRect(
      Math.round(lx - thickness / 2),
      Math.round(ly - thickness / 2),
      Math.round(thickness),
      Math.round(thickness)
    );
    m += 1;
  }
}
function drawCircle(
  circleX,
  circleY,
  circleWidth = 1,
  circleHeight = 1,
  thickness = 1,
  color = "#000000"
) {
  var x = circleX + circleWidth / 2;
  var y = circleY + circleHeight / 2;
  var angle = 0;
  var drawX = Math.round(x + (Math.sin(degToRad(angle)) * circleWidth) / 2);
  var drawY = Math.round(y + (Math.cos(degToRad(angle)) * circleHeight) / 2);
  var lastX = drawX;
  var lastY = drawY;
  while (angle < 360) {
    angle += 3;
    var drawX = Math.round(x + (Math.sin(degToRad(angle)) * circleWidth) / 2);
    var drawY = Math.round(y + (Math.cos(degToRad(angle)) * circleHeight) / 2);
    betterLineto(lastX, lastY, drawX, drawY, thickness, color);
    lastX = drawX;
    lastY = drawY;
  }
}

function mouseMoved(e) {
  var scale = zoom.value / 100;
  pos = getMousePos(paintCVS, e);
  pos.x = pos.x / scale;
  pos.y = pos.y / scale;

  mouse = true;
}

function touchMove(e, t) {
  var scale = zoom.value / 100;
  pos = getTouchPos(paintCVS, e);
  pos.x = pos.x / scale;
  pos.y = pos.y / scale;

  mouse = true;
  e.preventDefault();
}
document.onmousemove = mouseMoved;
var clickPos = {
  x: 0,
  y: 0,
};
var clickData = null;
var currentText = "";

function getPixel(imageData, x, y) {
  // Check bounds
  if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
    return [-1, -1, -1, -1]; // Impossible color (out of bounds)
  }

  // Get pixel's RGBA value
  const offset = (y * imageData.width + x) * 4;
  return imageData.data.slice(offset, offset + 4);
}

function setPixel(imageData, x, y, color) {
  // Set pixel color
  const offset = (y * imageData.width + x) * 4;
  imageData.data[offset + 0] = color[0]; // Red
  imageData.data[offset + 1] = color[1]; // Green
  imageData.data[offset + 2] = color[2]; // Blue
  imageData.data[offset + 3] = color[3]; // Alpha
}

function colorsMatch(a, b, rangeSq) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  const da = a[3] - b[3];
  return dr * dr + dg * dg + db * db + da * da < rangeSq;
}

function floodFill(ctx, x, y, fillColor, range = 1) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const width = imageData.width;
  const height = imageData.height;

  const targetColor = getPixel(imageData, x, y); // Color to match
  const rangeSq = range * range;

  // If the target color and fill color are the same, do nothing
  if (colorsMatch(targetColor, fillColor, 1)) return;

  // Initialize stack and visited array
  const stack = [[x, y]];
  const visited = new Uint8Array(width * height); // Efficient memory usage with Uint8Array

  while (stack.length > 0) {
    const [currentX, currentY] = stack.pop();

    // Skip out-of-bounds or already-visited pixels
    if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue;
    const idx = currentY * width + currentX;
    if (visited[idx]) continue;

    // Get the current pixel's color
    const currentColor = getPixel(imageData, currentX, currentY);

    // If the current pixel color matches the target color, fill it
    if (colorsMatch(currentColor, targetColor, rangeSq)) {
      setPixel(imageData, currentX, currentY, fillColor); // Set the new color
      visited[idx] = 1; // Mark as visited

      // Add adjacent pixels to the stack (4-connected neighbors)
      stack.push([currentX + 1, currentY]); // Right
      stack.push([currentX - 1, currentY]); // Left
      stack.push([currentX, currentY + 1]); // Down
      stack.push([currentX, currentY - 1]); // Up
    }
  }

  // Put the updated image data back on the canvas
  ctx.putImageData(imageData, 0, 0);
}


function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function mouseDownFunctions() {
  if (currentMode == "rect") {
    rect = pos;
    rect.width = 0;
    rect.height = 0;
    var data = document.createElement("img");
    data.src = paintCVS.toDataURL(0, 0, paintCVS.width, paintCVS.height);
    rect.img = data;
  }
  if (currentMode == "circle") {
    circle = pos;
    circle.width = 0;
    circle.height = 0;
    var data = document.createElement("img");
    data.src = paintCVS.toDataURL(0, 0, paintCVS.width, paintCVS.height);
    circle.img = data;
  }
  if (currentMode == "outline-rect") {
    rect = pos;
    rect.width = 0;
    rect.height = 0;
    var data = document.createElement("img");
    data.src = paintCVS.toDataURL(0, 0, paintCVS.width, paintCVS.height);
    rect.img = data;
  }
  if (currentMode == "text") {
    ctx.font = `${thickness.value}px arial`;
    var t = textValue.value;
    ctx.fillStyle = color.value;
    ctx.fillText(
      t,
      ctx.measureText(t).width / -2 + pos.x,
      thickness.value / 4 + pos.y
    );
  }
  if (currentMode == "fill") {
    if (transparent.checked) {
      var trs = 0;
    } else {
      var trs = 256;
    }
    try {
      //i relized there is a sort of bug with the zoom.
      //to fix this, put it on a tempomary canvas then fill it, then draw the canvas onto the main one.
      fillCVS.width = paintCVS.width;
      fillCVS.height = paintCVS.height;
      fctx.putImageData(
        ctx.getImageData(0, 0, fctx.canvas.width, fctx.canvas.height),
        0,
        0
      );
      floodFill(fctx, Math.round(pos.x), Math.round(pos.y), [
        hexToRgb(color.value).r,
        hexToRgb(color.value).g,
        hexToRgb(color.value).b,
        trs,
      ]);
      ctx.putImageData(
        fctx.getImageData(0, 0, fctx.canvas.width, fctx.canvas.height),
        0,
        0
      );
    } catch (e) {
      window.alert(e);
    }
  }
  if (currentMode == "darken") {
    if (down) {
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = "black";
      ctx.fillRect(
        Math.round(pos.x - thickness.value / 2),
        Math.round(pos.y - thickness.value / 2),
        Math.round(thickness.value),
        Math.round(thickness.value)
      );
      ctx.globalAlpha = 1;
    }
  }
  if (currentMode == "lighten") {
    if (down) {
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = "white";
      ctx.fillRect(
        Math.round(pos.x - thickness.value / 2),
        Math.round(pos.y - thickness.value / 2),
        Math.round(thickness.value),
        Math.round(thickness.value)
      );
      ctx.globalAlpha = 1;
    }
  }
  clickPos = pos;
  clickData = document.createElement("img");
  clickData.src = paintCVS.toDataURL(0, 0, paintCVS.width, paintCVS.height);
}

function mouseDown() {
  down = true;
  mouseDownFunctions();
}
paintCVS.onmousedown = mouseDown;

function fixUndo() {
  var newUndo = [];
  for (var data of undoData) {
    if (!(newUndo.pop().data == data.data)) {
      newUndo.push(data);
    }
  }
  undoData = newUndo;
}

function mouseUp() {
  down = false;
  if (rect) {
    drawing.push({
      type: "rect",
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
    });
    rect = null;
  }
  setTimeout(() => {
    /*if (!(undoData.length > 0)) {
        undoData.push(ctx.getImageData(0,0,paintCVS.width,paintCVS.height));
        } else {
        if (!(ctx.getImageData(0,0,paintCVS.width,paintCVS.height).data == undoData[undoData.length-1].data)) {
        undoData.push(ctx.getImageData(0,0,paintCVS.width,paintCVS.height));
        }
        }
        fixUndo();*/
    undoData.push(ctx.getImageData(0, 0, paintCVS.width, paintCVS.height));
  }, 150);
}
document.onmouseup = mouseUp;

function touchStart(e) {
  touchMove(e);
  lastPos = pos;
  down = true;
  mouseDownFunctions();
  e.preventDefault();
}
document.addEventListener("touchend", mouseUp, { passive: false });
paintCVS.addEventListener("touchmove", touchMove, { passive: false });
paintCVS.addEventListener("touchstart", touchStart, { passive: false });

var mypos = {
  x: 0,
  y: 0,
};
var drawing = [];

function loadDrawing() {
  ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
  for (var info of drawing) {
    if (info.type == "rect") {
      ctx.fillRect(info.x, info.y, info.width, info.height);
    }
    if (info.type == "line") {
      ctx.beginPath();
      ctx.lineWidth = info.t;
      ctx.moveTo(info.px, info.py);
      ctx.lineTo(info.x, info.y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}
//document.onkeydown = function () {loadDrawing();};
var rel = false;

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
var movePos = {
  x: 0,
  y: 0,
};
var putCVS = document.createElement("canvas");
var ctx2 = putCVS.getContext("2d");

function fixWidthAndHeight(x, y, w, h, w2, h2) {
  var outpos = {};

  // Adjust x position if width is negative (dragging to the left)
  if (w < 0) {
    outpos.x = x + w;  // Adjust x to the left if width is negative
    outpos.width = -w;  // Use positive width
  } else {
    outpos.x = x;       // Use original x if width is positive
    outpos.width = w;   // Use original width if positive
  }

  // Adjust y position if height is negative (dragging upwards)
  if (h < 0) {
    outpos.y = y + h;   // Adjust y upwards if height is negative
    outpos.height = -h; // Use positive height
  } else {
    outpos.y = y;       // Use original y if height is positive
    outpos.height = h;  // Use original height if positive
  }

  return outpos;
}



function removeMovePos() {
  movePos2 = {
    action: -1,
  };
}

setInterval(() => {
  try {
    /*window.onbeforeunload = function () {
        e.returnValue = "You may have unsaved changes, do you want to leave?";
        return "Leave?";
        };*/
    //ctx.fillRect(pos.x,pos.y,32,32);
    ctx.save();
    ctx.strokeStyle = color.value;
    ctx.fillStyle = color.value;
    if (currentMode == "brush") {
      if (down) {
        if (!(lastPos == pos)) {
          if (dot.checked) {
            ctx.fillRect(
              Math.round(pos.x - thickness.value / 2),
              Math.round(pos.y - thickness.value / 2),
              Math.round(thickness.value),
              Math.round(thickness.value)
            );
          } else {
            //ctx.beginPath();
            //ctx.lineWidth = thickness.value;
            //ctx.moveTo(lastPos.x, lastPos.y);
            //ctx.lineTo(pos.x, pos.y);
            //ctx.closePath();
            //ctx.stroke();
            betterLineto(
              lastPos.x,
              lastPos.y,
              pos.x,
              pos.y,
              thickness.value,
              color.value
            );
          }
          //ctx.fillRect(pos.x,pos.y,thickness.value,thickness.value);
        } else {
          ctx.fillRect(
            Math.round(pos.x - thickness.value / 2),
            Math.round(pos.y - thickness.value / 2),
            Math.round(thickness.value),
            Math.round(thickness.value)
          );
        }
      } else {
        ctx.moveTo(lastPos.x, lastPos.y);
      }
      rect = null;
    }
    if (currentMode == "rect") {
      if (down) {
        ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
        ctx.drawImage(rect.img, 0, 0, paintCVS.width, paintCVS.height);
        rect.width = Math.round(pos.x - rect.x);
        rect.height = Math.round(pos.y - rect.y);
        if (isShiftDown) {
            const dx = Math.abs(pos.x - rect.x);
            const dy = Math.abs(pos.y - rect.y);
            const maxDisplacement = Math.max(dx, dy);
            rect.width = pos.x < rect.x ? -maxDisplacement : maxDisplacement;
            rect.height = pos.y < rect.y ? -maxDisplacement : maxDisplacement;
          }
        ctx.fillRect(
          Math.round(rect.x),
          Math.round(rect.y),
          rect.width,
          rect.height
        );
      }
    }
    if (currentMode == "circle") {
      if (down) {
        ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
        ctx.drawImage(circle.img, 0, 0, paintCVS.width, paintCVS.height);
        circle.width = Math.round(pos.x - circle.x);
        circle.height = Math.round(pos.y - circle.y);
        if (isShiftDown) {
          const dx = Math.abs(pos.x - circle.x);
          const dy = Math.abs(pos.y - circle.y);
          const maxDisplacement = Math.max(dx, dy);
          circle.width = pos.x < circle.x ? -maxDisplacement : maxDisplacement;
          circle.height = pos.y < circle.y ? -maxDisplacement : maxDisplacement;
        }
        drawCircle(
          Math.round(circle.x),
          Math.round(circle.y),
          circle.width,
          circle.height,
          +thickness.value || 5,
          color.value
        );
        outlineRectPlaced = false;
      }
    }
    if (currentMode == "outline-rect") {
      if (down) {
        ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
        ctx.drawImage(rect.img, 0, 0, paintCVS.width, paintCVS.height);
        rect.width = Math.round(pos.x - rect.x);
        rect.height = Math.round(pos.y - rect.y);
        ctx.lineWidth = Math.round(thickness.value);
        ctx.strokeRect(
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.width),
          Math.round(rect.height)
        );
      }
    }
    if (currentMode == "line") {
      if (down) {
        ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
        ctx.drawImage(clickData, 0, 0, paintCVS.width, paintCVS.height);
        //ctx.beginPath();
        ctx.lineWidth = thickness.value;
        //ctx.moveTo(Math.round(clickPos.x), Math.round(clickPos.y));
        //ctx.lineTo(Math.round(pos.x), Math.round(pos.y));
        //ctx.closePath();
        //ctx.stroke();
        betterLineto(
          Math.round(clickPos.x),
          Math.round(clickPos.y),
          Math.round(pos.x),
          Math.round(pos.y),
          thickness.value,
          color.value
        );
      }
    }
    if (currentMode == "erase") {
      if (down) {
        var t = thickness.value;
        ctx.clearRect(pos.x - t / 2, pos.y - t / 2, t, t);
      }
    }
    if (currentMode == "get color") {
      if (down) {
        var rgb = [
          ctx.getImageData(pos.x, pos.y, 1, 1).data[0],
          ctx.getImageData(pos.x, pos.y, 1, 1).data[1],
          ctx.getImageData(pos.x, pos.y, 1, 1).data[2],
        ];
        if (ctx.getImageData(pos.x, pos.y, 2, 2).data[3]) {
          color.value = rgbToHex(rgb[0], rgb[1], rgb[2]);
        } else {
          color.value = "#FFFFFF";
        }
      }
    }
    if (currentMode == "staticify") {
      if (down) {
        try {
          var imageData = ctx.getImageData(pos.x, pos.y, 32, 32);
          var i = 0;
          while (imageData.data.length < i) {
            imageData.data[i + 0] = Math.random() * 256;
            imageData.data[i + 1] = Math.random() * 256;
            imageData.data[i + 2] = Math.random() * 256;
            imageData.data[i + 3] = 256;
            i += 3;
          }
          ctx.putImageData(imageData, pos.x, pos.y);
        } catch (e) {
          window.alert(e);
        }
      }
    }
    if (currentMode == "spray") {
      if (down) {
        try {
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(
              Math.round(
                pos.x -
                  thickness.value / 1 +
                  (Math.random() * thickness.value - thickness.value / -2)
              ),
              Math.round(
                pos.y -
                  thickness.value / 1 +
                  (Math.random() * thickness.value - thickness.value / -2)
              ),
              Math.round(thickness.value * 0.1),
              Math.round(thickness.value * 0.1)
            );
          }
        } catch (e) {
          window.alert(e);
        }
      }
    }
    if (currentMode == "move2") {
      if (down) {
        ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
        ctx.putImageData(movePos.data, pos.x - movePos.x, pos.y - movePos.y);
      } else {
        movePos = {
          x: pos.x,
          y: pos.y,
          data: ctx.getImageData(0, 0, paintCVS.width, paintCVS.height),
        };
      }
    }

    try {
      if (currentMode == "move") {
        function renderMovePos() {
  var flipx = 1;
  var flipy = 1;

  // Check if the width is negative (flip horizontally)
  if (movePos2.width < 0) {
    flipx = -1;
  }

  // Check if the height is negative (flip vertically)
  if (movePos2.height < 0) {
    flipy = -1;
  }

  // Set the canvas width and height based on absolute values of width and height
  ctx2.canvas.width = Math.abs(movePos2.width);
  ctx2.canvas.height = Math.abs(movePos2.height);
  
  // Clear the canvas to prepare for rendering the image data
  ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
  ctx2.putImageData(movePos2.putdata, 0, 0);

  // Adjust the position based on the negative width/height
  var pos2 = fixWidthAndHeight(
    Math.round(movePos2.newx),
    Math.round(movePos2.newy),
    Math.round(ctx2.canvas.width),
    Math.round(ctx2.canvas.height),
    Math.round(movePos2.width),
    Math.round(movePos2.height)
  );

  // Draw the image on the main canvas at the adjusted position
  // If the width is negative, we need to adjust the x position
  var drawX = pos2.x;
  if (movePos2.width < 0) {
    drawX = pos2.x - pos2.width; // Adjust for negative width
  }
  var drawY = pos2.y;
  if (movePos2.height < 0) {
    drawY = pos2.y - pos2.height; // Adjust for negative width
  }

  // Draw the image with the calculated x and y positions
  ctx.drawImage(
    ctx2.canvas,
    drawX, // The X coordinate where the rectangle will be drawn
    drawY, // The Y coordinate where the rectangle will be drawn
    pos2.width, // The width of the rectangle (absolute value)
    pos2.height // The height of the rectangle (absolute value)
  );
}


        if (down) {
          if (movePos2.action == 0 || movePos2.action == 1) {
            ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
            movePos2 = {
              width: Math.round(pos.x - movePos2.x),
              height: Math.round(pos.y - movePos2.y),
              data: null,
              action: 1,
              x: Math.round(movePos2.x),
              y: Math.round(movePos2.y),
              saveData: movePos2.saveData,
            };
            //window.alert(movePos2.x);
            //window.alert(movePos2.y);
            //window.alert(movePos2.width);
            //window.alert(movePos2.height);
            //var w = 1;
            //var h = 1;
            //if (movePos2.width > 0) {w = movePos2.width;}
            //if (movePos2.height > 0) {w = movePos2.height;}
            // if ((movePos2.width > 0) && (movePos2.height > 0)) {

            // }
            ctx.putImageData(movePos2.saveData, 0, 0);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "green";
            ctx.fillRect(
              movePos2.x,
              movePos2.y,
              movePos2.width,
              movePos2.height
            );
            ctx.globalAlpha = 1;
          } else {
            if (movePos2.action == 2) {
              movePos2.action = 3;
            }
            if (movePos2.action == 3) {
              ctx.putImageData(movePos2.saveData, 0, 0);
              if (!movePos2.clickpos) {
                movePos2.clickpos = {
                  x: pos.x - movePos2.x,
                  y: pos.y - movePos2.y,
                };
              }
              if (!movePos2.putdata) {
                if (
                  Math.abs(movePos2.width) < 1 ||
                  Math.abs(movePos2.height) < 1
                ) {
                  removeMovePos();
                  return;
                } else {
                  movePos2.putdata = ctx.getImageData(
                    movePos2.x,
                    movePos2.y,
                    movePos2.width,
                    movePos2.height
                  );
                }
              }
              movePos2.newx = Math.round(pos.x - movePos2.clickpos.x);
              movePos2.newy = Math.round(pos.y - movePos2.clickpos.y);
              ctx.clearRect(
                movePos2.x,
                movePos2.y,
                movePos2.width,
                movePos2.height
              );
              ctx.globalAlpha = 1;
              renderMovePos();
              ctx.fillStyle = "green";
              ctx.globalAlpha = 0.5;
              ctx.fillRect(
                Math.round(movePos2.newx),
                Math.round(movePos2.newy),
                Math.round(movePos2.width),
                Math.round(movePos2.height)
              );
              ctx.globalAlpha = 1;
              movePos2.after = true;
            }
          }
        } else {
          if (movePos2.action > 0) {
            if (movePos2.action == 1) {
              movePos2.action = 2;
            }
            if (movePos2.after) {
              ctx.putImageData(movePos2.saveData, 0, 0);
              ctx.clearRect(
                movePos2.x,
                movePos2.y,
                movePos2.width,
                movePos2.height
              );
              ctx.globalAlpha = 1;
              renderMovePos();
              removeMovePos();
            }
          } else {
            movePos2 = {
              x: Math.round(pos.x),
              y: Math.round(pos.y),
              width: 1,
              height: 1,
              action: 0,
              saveData: ctx.getImageData(0, 0, paintCVS.width, paintCVS.height),
            };
            //window.alert(movePos2.x);
            //window.alert(movePos2.y);
          }
        }
      } else {
        if (!(movePos2.action < 1)) {
          ctx.putImageData(movePos2.saveData, 0, 0);
          if (movePos2.after) {
            ctx2.imageSmoothingEnabled = false;
            ctx.putImageData(movePos2.saveData, 0, 0);
            ctx.clearRect(
              Math.round(movePos2.x),
              Math.round(movePos2.y),
              Math.round(movePos2.width),
              Math.round(movePos2.height)
            );
            ctx.globalAlpha = 1;
            renderMovePos();
          }
          removeMovePos();
        }
      }
    } catch (e) {
      window.alert(e);
    }
    ctx.restore();

    if (mouse) {
      lastPos = pos;
    }
  } catch (e) {
    window.alert(e);
  }
  var selectInfo = document.getElementById("selectInfo");
  if (movePos2.action == -1) {
    selectInfo.textContent = "";
  } else {
    selectInfo.textContent = `X: ${movePos2.x} Y: ${movePos2.y} Width: ${movePos2.width} Height: ${movePos2.height}`;
  }
}, 1);
erase.onclick = function () {
  if (window.confirm("Erase all?")) {
    ctx.clearRect(0, 0, paintCVS.width, paintCVS.height);
  }
};
var controlHeld = false;
document.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() == "control") {
    controlHeld = false;
    event.preventDefault();
  }
});
async function dataURLToBlob(url) {
  return await (await fetch(url)).blob();
}
async function copyDataURL(dataURL) {
  if (navigator.clipboard.write) {
    var items = [
      new ClipboardItem({
        "image/png": await dataURLToBlob(dataURL),
      }),
    ];
    await navigator.clipboard.write(items);
    console.log("Copied image.");
  }
}
window.addEventListener("paste", async function (e) {
  e.preventDefault();
  e.stopPropagation();
  let file = e.clipboardData.files[0];
  var reader = new FileReader();
  reader.onload = function () {
    var img = document.createElement("img");
    img.src = reader.result;
    img.onload = function () {
      ctx.drawImage(
        img,
        Math.round(pos.x),
        Math.round(pos.y),
        Math.round(img.width),
        Math.round(img.height)
      );
    };
  };

  reader.readAsDataURL(file);

  e.preventDefault();
});
function doUndo() {
  try {
    //redoData.push(undoData[undoData.length-1]);
    undoData.splice(-1);
    if (undoData.length > 0) {
      ctx.putImageData(undoData[undoData.length - 1], 0, 0);
    }
  } catch (e) {
    window.alert("failed to undo:" + e);
  }
}
document.addEventListener("keydown", (event) => {
  if (event.key == "Shift") {
    isShiftDown = true;
  }
  if (false) {
    var imgd = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    var index = 0;
    var newdata = [];
    var endadd = 0;
    while (index < imgd.data.length) {
      index += 1;
      index += 1;
      index += 1;
      if (imgd.data[index] > 100) {
        newdata.push(imgd.data[index - 3]);
        newdata.push(imgd.data[index - 2]);
        newdata.push(imgd.data[index - 1]);
        newdata.push(imgd.data[index]);
      } else {
        newdata.push(0);
        newdata.push(0);
        newdata.push(0);
        newdata.push(0);
      }
      index += 1;
    }
    index = 0;
    while (index < endadd) {
      newdata.push(0);
      index += 1;
    }
    imgd.data.set(newdata);
    ctx.putImageData(imgd, 0, 0);
  }
  if (event.key.toLowerCase() == "control") {
    controlHeld = true;
    event.preventDefault();
  }
  if (event.key.toLowerCase() == "z" && controlHeld) {
    doUndo();
    event.preventDefault();
  }
  /*if (event.key.toLowerCase() == "y" && controlHeld) {
    try{
    undoData.push(redoData[redoData.length-1]);
    redoData.splice(-1);
    if (redoData.length > 0) {
    ctx.putImageData(redoData[redoData.length-1],0,0);
    }
    }catch(e){
    window.alert("failed to redo:"+e);
    }
    event.preventDefault();
    }*/
});
document.addEventListener("keyup", (event) => {
  if (event.key == "Shift") {
    isShiftDown = false;
  }
});
window.addEventListener("copy", (event) => {
  if (movePos2.action == 2) {
    var urlCanvas = document.createElement("canvas");
    var ctxURL = urlCanvas.getContext("2d");

    ctx.putImageData(movePos2.saveData, 0, 0);

    var data = ctx.getImageData(
      movePos2.x,
      movePos2.y,
      movePos2.width,
      movePos2.height
    );

    ctxURL.canvas.width = movePos2.width;
    ctxURL.canvas.height = movePos2.height;

    ctxURL.clearRect(0, 0, movePos2.width, movePos2.height);

    ctxURL.putImageData(data, 0, 0);

    copyDataURL(urlCanvas.toDataURL());

    removeMovePos();

    event.preventDefault();
  }
});
var undoButton = document.getElementById("undoButton");
undoButton.onclick = function () {
  doUndo();
};

//unused script
function inside(p, vs) {
  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i][0],
      yi = vs[i][1];
    var xj = vs[j][0],
      yj = vs[j][1];
    var intersect =
      yi > p[1] != yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function draw(p) {
  p.map((x) => ctx.lineTo(x[0], x[1]));
  ctx.stroke();
}
