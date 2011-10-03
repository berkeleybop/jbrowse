var Util = {};

Util.is_ie = navigator.appVersion.indexOf('MSIE') >= 0;
Util.is_ie6 = navigator.appVersion.indexOf('MSIE 6') >= 0;
Util.addCommas = function(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
};

Util.wheel = function(event){
    var delta = 0;
    if (!event) event = window.event;
    if (event.wheelDelta) {
        delta = event.wheelDelta/120;
        if (window.opera) delta = -delta;
    } else if (event.detail) { delta = -event.detail/3;	}
    return Math.round(delta); //Safari Round
};

Util.isRightButton = function(e) {
    if (!e) var e = window.event;
    if (e.which) return e.which == 3;
    else if (e.button) return e.button == 2;
};

Util.getViewportWidth = function() {
  var width = 0;
  if( document.documentElement && document.documentElement.clientWidth ) {
    width = document.documentElement.clientWidth;
  }
  else if( document.body && document.body.clientWidth ) {
    width = document.body.clientWidth;
  }
  else if( window.innerWidth ) {
    width = window.innerWidth - 18;
  }
  return width;
};

Util.getViewportHeight = function() {
  var height = 0;
  if( document.documentElement && document.documentElement.clientHeight ) {
    height = document.documentElement.clientHeight;
  }
  else if( document.body && document.body.clientHeight ) {
    height = document.body.clientHeight;
  }
  else if( window.innerHeight ) {
    height = window.innerHeight - 18;
  }
  return height;
};

Util.findNearest = function(numArray, num) {
    var minIndex = 0;
    var min = Math.abs(num - numArray[0]);
    for (var i = 0; i < numArray.length; i++) {
        if (Math.abs(num - numArray[i]) < min) {
            minIndex = i;
            min = Math.abs(num - numArray[i]);
        }
    }
    return minIndex;
};


/* Util.object_id_counter = 0; */

/**
*  Warning: assumes uid property is never assigned by anything else
*  Can only assign unique ID once per object, further attempts will fail with log message
*/
/*
Util.assignUniqueId = function(obj)  {
    if (obj.uid)  {
	console.log("in Util.assignUniqueId(), obj already has uid property: " + obj.uid);
	console.log(obj);
    }
    else  {
	obj.uid = String(Util.object_id_counter);
	Util.object_id_counter++;
    }
    return obj.uid;
}
*/

if (!Array.prototype.reduce)
{
  Array.prototype.reduce = function(fun /*, initial*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len == 0 && arguments.length == 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2)
    {
      var rv = arguments[1];
    }
    else
    {
      do
      {
        if (i in this)
        {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      }
      while (true);
    }

    for (; i < len; i++)
    {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  };
}

function Finisher(fun) {
    this.fun = fun;
    this.count = 0;
}

Finisher.prototype.inc = function() {
    this.count++;
};

Finisher.prototype.dec = function() {
    this.count--;
    this.finish();
};

Finisher.prototype.finish = function() {
    if ((this.count <= 0) && this.fun) this.fun();
};

/**
 *  return object with x/y coord for any mouse event, relative to the given element (treat elem top left corner as (0,0))
 *        { x:  relativeX, 
 *          y:  relativeY } 
 *  elem can also be wrapped jquery result set (jquery object), in which case result is based on first elem in result set
 *  currently assumes:
 *      event is a mouse event (plain Javascript event or JQuery event)
 *      elem is displayed  (see JQuery.offset() docs)
 *      no border/margin/padding set on the doc <body> element  (see JQuery.offset() docs)
 *      if in IE<9, either page is not scrollable (in the HTML page sense) OR event is JQuery event
 *         (currently JBrowse index.html page is not scrollable (JBrowse internal scrolling is NOT same as HTML page scrolling))
 */
Util.relativeXY = function(event, elem)  {
    var $elem;
    if (elem instanceof jQuery)  { $elem = elem; }
    else  { $elem = $(elem); }
    var offset = $elem.offset();
    var mousex = event.pageX;
    var mousey = event.pageY;
    if (!mousex || !mousey)  {  // special case mainly for (IE<9 && event not JQuery event)
	mousex = event.clientX;
	mousey = event.clientY;
	if (!mousex || !mousey)  { return undefined; }  // bail if can't find mouse coords
    }
    var x = mousex - offset.left;
    var y = mousey - offset.top;
    // console.log("x: " + x + ", y: " + y + ", mousex: " + mousex + ", mousey = " + mousey);
    return { 'x': x, 'y': y };
};


/* returns true if string str starts with string prefix (exact match)
 * returns false otherwise
 * (not sure if needed though, in most cases /^prefix/.test(str) does same thing?
 */
Util.startsWith = function(str, prefix)  {
    return (str.lastIndexOf(prefix, 0) === 0);
};

/* returns true if string str ends with string suffix (exact match)
 *
 * (not sure if needed though, in most cases /^prefix/.test(str) does same thing?
 */
Util.endsWith = function(str, suffix)  {
    return (str.indexOf(suffix, str.length - suffix.length) !== -1);
};


/**
 *  Returns CSS style associated with a given CSS selector in loaded stylesheets, 
 *      or null if no matching style is found
 *  Assumes all style selectors are lowercase
 *  WARNING!  access to styleSheet.cssRules/rules follows same-origin policy, 
 *            and attempts to access rules of styleSheet loaded from differenct origin
 *            can throw security exceptions
 *      it is recommended that stylesheets are given titles, and this function is only 
 *         called with sheet_title arg for stylesheet that is known to be same-origin
 */
Util.getCssStyle = function(selector, sheet_title) {               
    if (document.styleSheets) {                           
	var slength = document.styleSheets.length;
	for (var sindex=0; sindex<slength; sindex++) { 
            var styleSheet=document.styleSheets[sindex]; 
            if ( (! sheet_title) || (styleSheet.title === sheet_title)) {
		// console.log("sheet title: " + styleSheet.title);
		var rules = styleSheet.cssRules; // Firefox, Safari?
		if (! rules) {
		    rules = styleSheet.rules;  // IE
		}
		if (rules)  {
		    var rlength = rules.length;
		    for (var rindex = 0; rindex<rlength; rindex++) {
			var rule = rules[rindex];
			// console.log(rule.selectorText);
			if (rule.selectorText === selector) { 
			    return rule;     // found matching rule, return it              
			}                                      
		    }                                             
		} 
	    }
	}                                                   
    }                                                      
    return null;   // no matching CSS rule found                                       
};                                          


/*
Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
