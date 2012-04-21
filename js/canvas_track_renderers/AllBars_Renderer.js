
/**
*  Renders EVERY data point as a bar from 0 to score at genome coord, 1 bp wide?
*/
function AllBars_Renderer()  {  }

AllBars_Renderer.NAME = "AllBars";
AllBars_Renderer.ID = "AllBars";

CanvasTrack.registerRenderer(AllBars_Renderer);

AllBars_Renderer.drawBlock = function (track, blockIndex, blockDiv,
					     leftBlock, rightBlock,
					     leftBase, rightBase,
					     scale, stripeWidth,
					     containerStart, containerEnd) {
    if (CanvasTrack.VERBOSE_RENDER) {  console.log("called AllBars_Renderer.drawBlock");  }
    var mindex = track.getCoordIndex(leftBase);
    var maxdex = track.getCoordIndex(rightBase) + 1;
    if (maxdex >= track.locs.length)  { maxdex = track.locs.length-1; }
    
    // scale is in units of pixels per base
    // stripeWidth is in pixels
    // based on $(canvas).width() and $(blockDiv).width(), block div and canvas not yet 
    //     set to actual dimensions??
    // but stripeWidth appears accurate, so relying on it...
    var pixels_per_base = scale;
    var bases_per_pixel = 1.0/scale;
    //    console.log("bases per pixel: " + bases_per_pixel);

    var canvas = blockDiv.canvas;
    canvas.height = 100; 
    canvas.width = stripeWidth;
    var context = canvas.getContext("2d"); 
    context.clearRect(0,0,canvas.width,canvas.height);
    //  console.log("pixels per base: " + pixels_per_base + ", bases per pixel: " + bases_per_pixel);
    if (CanvasTrack.VERBOSE_RENDER)  {
	console.log("stripeWidth: " + stripeWidth + ", end-start: " + (rightBase - leftBase) + ", block width: " + $(blockDiv).width());
	console.log("canvas coord width: " + canvas.width + ", canvas pixel width = " + $(canvas).width());
	console.log("containerStart: " + containerStart + ",  containerEnd: " + containerEnd);
    }

    // clear transform (set to identity matrix) just in case;
    context.setTransform(1,0,0,1,0,0);
    // scale first, then translate?
    // want to get 
    //    pixel_position = scale * (base_position - leftBase)

    //  var hscale = 100 / (track.maxviz-track.minviz);
    var hscale = canvas.height / (track.maxviz-track.minviz);
    // for scaling by minviz/maxviz, not clipping, won't be drawn if outside of canvas bounds anyway
    if (CanvasTrack.VERBOSE_RENDER)  { console.log("hscale: " + hscale); }
    //    context.scale(scale, 1.0);
    context.scale(scale, hscale);
    //    context.translate(-leftBase, 0);
    //    context.translate(-leftBase, (track.maxviz-100));
    context.translate(-leftBase, (track.maxviz-canvas.height));
    //  var col = CanvasTrack.canvas_test_colors[CanvasTrack.canvas_render_count % 3];
    //  context.fillStyle = col;
    //  CanvasTrack.canvas_render_count++;
    context.fillStyle = track.baseColor;

    var use_path = CanvasTrack.USE_PATH;
    if (use_path)  {
	context.beginPath();
    }
    if (pixels_per_base >= 1)  { // draw pixels_per_base wide
	if (CanvasTrack.VERBOSE_RENDER)  { console.log("drawing each point over multiple pixels"); }
	for (var index = mindex; index <= maxdex; index++)  {
	    var coord = track.locs[index];
	    var score = track.scores[index];
	    if (use_path)  {
		context.rect(coord, 100, 1, (score * -100));
		// context.rect(coord, 100, 1, (score * -1));
	    }
	    else  {
		context.fillRect(coord, 100, 1, (score * -100));
		// context.fillRect(coord, 100, 1, (score * -1));
	    }
	}
    }
    else  { 	// draw 1 pixel wide
	var coords = track.locs;
	var scores = track.scores;
	var clength = coords.length;
	for (var index = mindex; index <= maxdex; index++)  {
	    if (index >= clength || index < 0)  { console.log("exceeded plot data bounds"); }
	    var coord = coords[index];
	    var score = scores[index];
	    // if (score)  {  // skip edge cases where score is undefined...
	    if (use_path)  {
		context.rect(coord, 100, bases_per_pixel, (score * -100));
	    }
	    else  {
		context.fillRect(coord, 100, bases_per_pixel, (score * -100));
	    }
	    //   }
	}
    }
    if (use_path)  {
	context.fill();
	context.closePath();
    }
    track.heightUpdate(100, blockIndex);
};