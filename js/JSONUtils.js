function JSONUtils() {
}

// Convert an ApolloEditorService JSON feature to JBrowse JSON feature array
// form server into feature array (fa) for JBrowse.  fa[0] is an array of field definitions
// with each subsequent element being the data
/*
 JSONUtils.convertJsonToFeatureArray = function(jsonFeature) {
    var featureArray = new Array();
    featureArray[0] = jsonFeature.location.fmin;
    featureArray[1] = jsonFeature.location.fmax;
    featureArray[2] = jsonFeature.location.strand;
    featureArray[3] = jsonFeature.uniquename;
    return featureArray;
};
*/

// Creates a feature object in ApolloEditorService JSON format
/*
 JSONUtils.createJsonFeature = function(fmin, fmax, strand, cv, cvterm) {
    var feature = {
	"location": {
	    "fmin": fmin, 
	    "fmax": fmax, 
	    "strand": strand
	}, 
	"type": {
	    "cv": {
		"name": cv
	    }, 
	    "name": cvterm
	}
    };
    return feature;
};
*/

/**
*  creates a feature in JBrowse JSON format
*  takes as arguments:
*      afeature: feature in ApolloEditorService JSON format,
*      arep: ArrayRepr for kind of JBrowse feature to output
*      OLD: fields: array specifying order of fields for JBrowse feature 
*      OLD: subfields:  array specifying order of fields for subfeatures of JBrowse feature 
*   "CDS" type feature in Apollo JSON format is from genomic start of translation to genomic end of translation, 
*          (+ stop codon), regardless of intons, so one per transcript (usually)
*   "CDS" type feature in JBrowse JSON format is a CDS _segment_, which are piecewise and broken up by introns
*          therefore commonyly have multiple CDS segments
*          
*/
// JSONUtils.createJBrowseFeature = function(afeature, fields, subfields)  {
JSONUtils.createJBrowseFeature = function(arep, afeature, classIndex)  {
    // console.log("JSON: " + JSON.stringify(afeature));
    // console.log("JSONUtils.createJBrowseFeature, input feature:");
    // console.log(afeature);
    // var CONVERT_UTR_CDS = false;

    var loc = afeature.location;
    var uid = afeature.uniquename; 

    if (! classIndex)  {
	classIndex = 0;
    }
    var jfeature = new Array();


    // need ArrayRepr constructor that sets class field:
    //    var jfeature = arep.constructFeature(classIndex);
    // or probably better:
    //    var jfeature = arep.constructFeature(className);
    // 
    jfeature[0] = classIndex;
    arep.set(jfeature, "Start", loc.fmin);  // arep.fastSet(jfeature, "Start", loc.fmin);
    arep.set(jfeature, "End", loc.fmax);   //  arep.fastSet(jfeature, "End", loc.fmax);
    arep.set(jfeature, "Strand", loc.strand);   // arep.fastSet(jfeature, "Strand", loc.strand);

    //    if (fields["id"])  { jfeature[fields["id"]] = uid; }    
    // if (arep.fastGet(jfeature, "Id"))  {
    if (arep.hasDefinedAttribute(jfeature, "Id")) {
	arep.set(jfeature, "Id", uid);
    }
    //    if (fields["name"])  { var name = afeature.name ? afeature.name : uid; jfeature[fields["name"]] = name; }
   //  if (arep.fastGet(jfeature, "Name"))  {
    if (arep.hasDefinedAttribute(jfeature, "Name")) {
    	var name = afeature.name ? afeature.name : uid;
	arep.set(jfeature, "Name", name);
    }
    jfeature.uid = uid;

    // rename "CDS" to "wholeCDS", pass through other type names (currently only other type is "exon")
    if (arep.hasDefinedAttribute(jfeature, "Type"))  {
	var type = afeature.type.name;
	if (type == "CDS")  { type =  "wholeCDS"; }
	arep.set(jfeature, "Type", type);
    }
    /*
    if (fields["type"])  { 
	var type = afeature.type.name;
	if (type == "CDS")  { type =  "wholeCDS"; }
	//	if (type == "exon")  { type = "exon"; }
	jfeature[fields["type"]] = type;
    }
     */
    // may not need parent_id? including for now just in case
    // if (fields["parent_id"] && afeature.parent_id) { jfeature[fields["parent_id"]] = afeature.parent_id; }
    if (arep.hasDefinedAttribute(jfeature, "parent_id") && afeature.parent_id)  {
	arep.set(jfeature, "parent_id", afeature.parent_id);
    }
    if (afeature.properties) {
    	for (var i = 0; i < afeature.properties.length; ++i) {
    		var property = afeature.properties[i];
    		if (property.type.name == "comment" && property.value == "Manually set translation start") {
    			jfeature.manuallySetTranslationStart = true;
    		}
    	}
    }
    
    var children = afeature.children;
    if (children && arep.hasDefinedAttribute(jfeature, "Subfeatures"))  {
	//    if (fields["subfeatures"] && children)  {
	// jfeature[fields["subfeatures"]] = new Array();
	var subarray = new Array();
	arep.set(jfeature, "Subfeatures", subarray);
	var clength = children.length;
	for (var i = 0; i<clength; i++)  {
	    var achild = children[i];
//	    var jchild =  JSONUtils.createJBrowseFeature(achild, subfields, subfields);
	    var jchild =  JSONUtils.createJBrowseFeature(arep, achild, 1);
	    // jfeature[fields["subfeatures"]].push(jchild);
	    subarray.push(jchild);
	    if (jchild.manuallySetTranslationStart) {
	    	jfeature.manuallySetTranslationStart = true;
	    }
	}
    }
    // console.log("JSONUtils.createJBrowseFeature, output feature:");
    // console.log(jfeature);
    return jfeature;
};


/** 
*  creates a feature in ApolloEditorService JSON format
*  takes as argument:
*       jfeature: a feature in JBrowse JSON format, 
*       fields: array specifying order of fields in jfeature
*       subfields: array specifying order of fields in subfeatures of jfeature
*       specified_type (optional): type passed in that overrides type info for jfeature
*  ApolloEditorService format:
*    { 
*       "location" : { "fmin": fmin, "fmax": fmax, "strand": strand }, 
*       "type": { "cv": { "name":, cv },   // typical cv name: "SO" (Sequence Ontology)
*                 "name": cvterm },        // typical name: "transcript"
*       "children": { __recursive ApolloEditorService feature__ }
*    }
* 
*   For ApolloEditorService "add_feature" call to work, need to have "gene" as toplevel feature, 
*         then "transcript", then ???
*                 
*    JBrowse JSON fields example: ["start", "end", "strand", "id", "subfeatures"]
*
*    type handling
*    if specified_type arg present, it determines type name
*    else if fields has a "type" field, use that to determine type name
*    else don't include type 
*
*    ignoring JBrowse ID / name fields for now
*    currently, for features with lazy-loaded children, ignores children 
*/
JSONUtils.createApolloFeature = function(arep, jfeature, specified_type)   {
// JSONUtils.createApolloFeature = function(jfeature, fields, subfields, specified_type)   {
    var afeature = new Object();
    afeature.location = {
	"fmin": arep.get(jfeature, "Start"), 
	"fmax": arep.get(jfeature, "End"), 
	"strand": arep.get(jfeature, "Strand")
    };

    var typename;
    if (specified_type)  {
	typename = specified_type;
    }
//    else if (fields["type"])  { typename = jfeature[fields["type"]]; }
    else if (arep.hasDefinedAttribute(jfeature, "Type"))  {
	typename = arep.get(jfeature, "Type");
    }

    if (typename)  {
	afeature.type = {
	    "cv": {
		"name": "SO"
	    }
	};
	afeature.type.name = typename;
    }
    //    if (fields["subfeatures"])  {
    // var subfeats = jfeature[fields["subfeatures"]];
    if (arep.hasDefinedAttribute(jfeature, "Subfeatures"))  {
	var subfeats = arep.get(jfeature, "Subfeatures");
	if (subfeats && subfeats.length > 0 && (subfeats[0] instanceof Array))  {
	    afeature.children = new Array();
	    var slength = subfeats.length;
	    for (var i=0; i<slength; i++)  {
		var subfeat = subfeats[i];
		// afeature.children[i] = JSONUtils.createApolloFeature(subfeat, subfields); 
		//  var subtype = subfeat[subfields["type"]];
		var subtype = arep.get(subfeat, "Type");
		// if "wholeCDS", then translate to the equivalent "CDS" for server
		if (subtype === "wholeCDS")  {
		    afeature.children[i] = JSONUtils.createApolloFeature(arep, subfeat, "CDS"); 
		}
		else  {  // currently clietn "CDS" (CDS-segment), "UTR", etc. are all converted to "exon"
		    afeature.children[i] = JSONUtils.createApolloFeature(arep, subfeat, "exon"); 	
		}
	    }
	}
    }
    return afeature;
};


/*
*  takes a feature from a source_track and returns equivalent feature for a target_track, 
*       based on inspection of feature fields and subfields
*  only doing data conversion:
*       returned feature is _not_ added to target_track (if desired, must do elsewhere)
*       no rendering or div creation
*
*  GAH TODO:  need to make this more generic 
*       maybe loop through all fields of newfeat, populate any that have corresponding fields in feat, 
*          if no corresponding field then set to null (or undefined?)
*/
JSONUtils.convertToTrack = function(feat, source_track, target_track)  {
// JSONUtils.convertToTrack = function(arep, feat, is_subfeat, source_track, target_track)  {
    var newfeat = new Array();
    var source_arep = source_track.attrs;
    console.log(source_track);
    console.log(source_arep);
    var target_arep = target_track.attrs;
//    var source_fields = source_track.fields;
//    var source_subfields = source_track.subFields;
//    var target_fields = target_track.fields;
//    var target_subfields = target_track.subFields;
//    if (is_subfeat)  {
//	source_fields = source_subfields;
//	target_fields = target_subfields;
//    }
    // feature class assignment
    // this doesn't really work across tracks though (different class data structs) !!!
    newfeat[0] = feat[0];
    target_arep.set(newfeat, "Start",  source_arep.get(feat, "Start"));
    target_arep.set(newfeat, "End",    source_arep.get(feat, "End"));
    target_arep.set(newfeat, "Strand", source_arep.get(feat, "Strand"));
//    if (target_fields["id"])  {
//	newfeat[target_fields["id"]] = feat[source_fields["id"]];
//    }
    if (target_arep.hasDefinedAttribute(newfeat, "Id"))  {
	target_arep.set(newfeat, "Id", source_arep.get(feat, "Id"));
    }
    if (target_arep.hasDefinedAttribute(newfeat, "Name"))  {
	if (source_arep.hasDefinedAttribute(feat, "Name")) {
	    var source_name = source_arep.get(feat, "Name");
	}
	else  {
	     var source_name = source_arep.get(feat, "Id");
	}
	target_arep.set(newfeat, "Name", source_name);
    }
    if (target_arep.hasDefinedAttribute(newfeat, "Type"))  {
	target_arep.set(newfeat, "Type", source_arep.get(feat, "Type"));
    }

//    if (target_fields["subfeatures"] && source_fields["subfeatures"])   { 
    if (target_arep.hasDefinedAttribute(feat, "Subfeatures") &&
	source_arep.hasDefinedAttribute(newfeat, "Subfeatures"))  {

	var newsubfeats = new Array();
	// var subfeats = feat[source_fields["subfeatures"]];
	var subfeats = source_arep.get(feat, "Subfeatures"); 
	if (subfeats)  {
	    var slength = subfeats.length;
	    for (var i = 0; i<slength; i++)  {
		var oldsub = subfeats[i];
		var newsub = new Array();
		// not reliable!  need better way of mapping class data structs, and setting
		newsub[0] = oldsub[0];
		target_arep.set(newsub, "Start", source_arep.get(oldsub, "Start") );
		target_arep.set(newsub, "End", source_arep.get(oldsub, "End") );
		target_arep.set(newsub, "Strand", source_arep.get(oldsub, "Strand") );
		target_arep.set(newsub, "Type", source_arep.get(oldsub, "Type") );
		newsub.parent = newfeat;
		newsub.track = target_track;
		if (oldsub.uid)  {
		    newsub.uid = oldsub.uid;
		}
		newsubfeats[i] = newsub;
	    }
	}
	// newfeat[target_fields["subfeatures"]]  = newsubfeats;
	target_arep.set(newfeat, "Subfeatures", newsubfeats);
    }
    newfeat.track = target_track;
    newfeat.uid = feat.uid;
    return newfeat;
};
