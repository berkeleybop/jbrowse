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

/**
 * replace variables in a template string with values
 * @param template String with variable names in curly brackets
 *                 e.g., "http://foo/{bar}?arg={baz}
 * @param fillWith object with attribute-value mappings
 *                 e.g., {'bar': 'someurl', 'baz': 'valueforbaz'}
 * @returns the template string with variables in fillWith replaced
 *                 e.g., 'htp://foo/someurl?arg=valueforbaz'
 */
Util.fillTemplate = function(template, fillWith) {
    return template.replace(/\{([^}]+)\}/g,
                            function(match, group) {
                                if (fillWith[group] !== undefined)
                                    return fillWith[group];
                                else
                                    return "{" + group + "}";
                            });
};

/**
 * function to load a specified resource only once
 * @param url URL to get
 * @param stateObj object that stores the state of the load
 * @param successCalback function to call on a successful load
 * @param errorCallback function to call on an unsuccessful load
 */
Util.maybeLoad = function (url, stateObj, successCallback, errorCallback) {
    if (stateObj.state) {
        if ("loaded" == stateObj.state) {
            successCallback(stateObj.data);
        } else if ("error" == stateObj.state) {
            errorCallback();
        } else if ("loading" == stateObj.state) {
            stateObj.successCallbacks.push(successCallback);
            if (errorCallback) stateObj.errorCallbacks.push(errorCallback);
        }
    } else {
        stateObj.state = "loading";
        stateObj.successCallbacks = [successCallback];
        stateObj.errorCallbacks = [errorCallback];
        dojo.xhrGet(
            {
                url: url,
                handleAs: "json",
                load: function(o) {
                    stateObj.state = "loaded";
                    stateObj.data = o;
                    var cbs = stateObj.successCallbacks;
                    for (var c = 0; c < cbs.length; c++) cbs[c](o);
                },
                error: function() {
                    stateObj.state = "error";
                    var cbs = stateObj.errorCallbacks;
                    for (var c = 0; c < cbs.length; c++) cbs[c]();
                }
            });
    }
};

/**
 * updates a with values from b, recursively
 */
Util.deepUpdate = function(a, b) {
    for (var prop in b) {
        if ((prop in a)
            && ("object" == typeof b[prop])
            && ("object" == typeof a[prop]) ) {
            Util.deepUpdate(a[prop], b[prop]);
        } else {
            a[prop] = b[prop];
        }
    }
};

// from http://bugs.dojotoolkit.org/ticket/5794
Util.resolveUrl = function(baseUrl, relativeUrl) {
    // summary:
    // This takes a base url and a relative url and resolves the target url.
    // For example:
    // resolveUrl("http://www.domain.com/path1/path2","../path3") ->"http://www.domain.com/path1/path3"
    //
    if (relativeUrl.match(/\w+:\/\//))   
	// relativeUrl is actually absolute, so return unchanged (absolute resolved against anything yields itself)
	return relativeUrl;
    if (relativeUrl.charAt(0)=='/') {
	baseUrl = baseUrl.match(/.*\/\/[^\/]*/);
	return (baseUrl ? baseUrl[0] : '') + relativeUrl;
    }
    //TODO: handle protocol relative urls:  ://www.domain.com
    baseUrl = baseUrl.substring(0,baseUrl.length - baseUrl.match(/[^\/]*$/)[0].length);// clean off the trailing path
    if (relativeUrl == '.')
	return baseUrl;
    while (relativeUrl.substring(0,3) == '../') {
	baseUrl = baseUrl.substring(0,baseUrl.length - baseUrl.match(/[^\/]*\/$/)[0].length);
	relativeUrl = relativeUrl.substring(3);
    }
    return baseUrl + relativeUrl;
};

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

if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
        res[i] = fun.call(thisp, t[i], i, t);
    }

    return res;
  };
}

if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(searchElement /*, fromIndex */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0)
      return -1;

    var n = 0;
    if (arguments.length > 0)
    {
      n = Number(arguments[1]);
      if (n !== n) // shortcut for verifying if it's NaN
        n = 0;
      else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }

    if (n >= len)
      return -1;

    var k = n >= 0
          ? n
          : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++)
    {
      if (k in t && t[k] === searchElement)
        return k;
    }
    return -1;
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
