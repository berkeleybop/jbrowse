/**
*  Selection manager for bio-features
*     handles deselection of any ancestors/descendants of selected features
*        (which is desired behavior for feature selection)
*     assumes features have had their parent property set before calling selection manager methods
*  Sends selectionAdded() and selectionRemoved() function calls to listeners
*/
function FeatureSelectionManager()  {
    this.selected = [];
    this.listeners = [];
}


// adding a parent should remove all children
// adding a child should remove all parents

FeatureSelectionManager.prototype.addToSelection = function(feat)  {
    // remove any children
    var slength = selection.length;
    for (var i=0; i<slength; i++)  {
	var sfeat = this.selected[i];
	if (sfeat.parent === feat)  {
	    this._removeSelectionAt(i);
	    slength--;
	}
    }
    // remove any parents
    var parent = feat.parent;
    if (parent)  {  
	this.removeFromSelection(parent);
    }
    this.selected.push(feat);
    for (i in listeners)  {
	var listener = listeners[i];
	listener.selectionAdded(feat);
    }
}


FeatureSelectionManager.prototype.removeFromSelection = function(feat)  {
    var index = this.selected.indexOf(feat);
    if (index >= 0)  {
	this._removeSelectionAt(index, feat);
    }
}

FeatureSelectionManager.prototype._removeSelectionAt = function(index, feat)  {
    this.selected.splice(index, 1);
    for (i in listeners)  {
	var listener = listeners[i];
	listener.selectionRemoved(feat);
    }
}

FeatureSelectionManager.prototype.clearSelection = function()  {
    var previous_selected = this.selected;
    this.selected = [];
    for (sindex in previous_selected)  {
	var feat = previous_selected[sindex];
	for (lindex in listeners)  {
	    var listener = listeners[lindex];
	    listener.selectionRemoved(feat);
	}
    }
}

FeatureSelectionManager.prototype.getSelection = function()  {
    return this.selected;
}

FeatureSelectionManager.prototype.addListener = function(listener)  {
    this.listeners.push(listener);
}

FeatureSelectionManager.prototype.removeListener = function(listener)  {
    var index = this.listeners.indexOf(listener);
    this.listeners.splice(index, 1);
}
