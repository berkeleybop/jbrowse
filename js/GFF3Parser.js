/* 
Created by Justin Reese 9/2012
justaddcoffee@gmail.com

This is a very simple GFF3 parser that takes a GFF3 file such as this:

Group1.33	maker	gene	245454	247006	.	+	.	ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137;
Group1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;
Group1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;
Group1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;

and returns a JSON data structure like this:
{
"parsedData": [ // parsed data is an array
    {
    "ID": "maker-Group1%2E33-pred_gff_GNOMON-gene-4.137",
    "data":[ 
             {
	      "rawdata" : ["Group1.33","maker","gene","245454","247006",".","+",".","ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137"],
	      "attributes" :  {"ID" : "maker-Group1%2E33-pred_gff_GNOMON-gene-4.137", "Name" : "maker-Group1%252E33-pred_gff_GNOMON-gene-4.137"}
	     }
	     ],
    "children": [
       {
          "ID": "1:gnomon_566853_mRNA",
          "data": [
                     {
              	      "rawdata" : ["Group1.33","maker","mRNA","245454","247006",".","+",".","ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259"]
        	      "attributes" :  { "ID" : "1:gnomon_566853_mRNA", "Parent" : "maker-Group1%2E33-pred_gff_GNOMON-gene-4.137", "Name" : "gnomon_566853_mRNA", "_AED" : "0.45", "_eAED" : "0.45","_QI" : "138|1|1|1|1|1|4|191|259" }
		      }
                  ],
          "children": [
            {
            "ID": "1:gnomon_566853_mRNA:exon:5976",
            "data": [
                     {
              	      "rawdata" : ["Group1.33","maker","exon","245454","245533",".","+",".","ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA"]
        	      "attributes" :  {"ID" : "1:gnomon_566853_mRNA:exon:5976", "Parent" : "1:gnomon_566853_mRNA"}
		      }
		      ],
            "children": [],
            },
            {
	    "ID": "1:gnomon_566853_mRNA:exon:5977",
            "data": [ 
                     {
              	      "rawdata" : ["Group1.33","maker","exon","245702","245879",".","+",".","ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA"]
        	      "attributes" :  {"ID" : "1:gnomon_566853_mRNA:exon:5977", "Parent" : "1:gnomon_566853_mRNA"}
		      }
		     ],
            "children": [],
            }
           ]
        }
       ]
     }
   ],
   ... next parent/child/descendants, e.g. gene/mRNA/exons or whatever ...
],
"parseErrors" : [""]
"parseWarnings" : ["no GFF3 pragma"]
}

*/

function GFF3Parser() {
};

GFF3Parser.prototype.parse = function(gff3String) {
    // Right now this method assumes that gff3String is the entire GFF3
    // file in string form. This sucks a bit because it means we'll have to 
    // have both the parsed and unparsed GFF3 data in memory which is 
    // a waste of memory and will affect performance when the GFF3 files 
    // are big. Maybe we can refactor this later to accept a stream instead 
    // of a string. 

    // Pseudocode for what I'm doing below: 
    // for each line in giant GFF3 string (slurped GFF3 file):
    //    parse data into fields, parse 9th field into attributes hash
    //    if hasParentAttribute
    //       put into hasParent hash where key == id, value = hash of data struct with parsed fields and parsed attributes
    //    else 
    //       put into noParent hash where key == id, value = hash of data struct with parsed fields and parsed attributes
    // for each entry in noParent hash:
    //       put into JSON as Parent without any Children (yet)
    // for each entry in hasParent has
    //       make sure Parent ID is in seenIDs, or continue (TODO: put in orphans and put error in parseErrors array)
    //       find Parent in data structure (depth first search)
    //       put into Children array of Parent

    // search for a given ID in children, grandchildren, great-grandchildren, etc.
    var recursion_level = 0;
    var maximum_recursion_level = 200; 
    var recursiveChildSearch = function(thisLine, featureArrayToSearch) {
       recursion_level++;
       var thisParentId = thisLine["data"][0]["attributes"]["Parent"];
       // first, search each item in featureArrayToSearch
       for ( var j = 0; j < featureArrayToSearch.length; j++ ){
	   for ( var k = 0; k < featureArrayToSearch[j].length; k++ ){ 
	       if ( thisParentId == featureArrayToSearch[j][k]["ID"] ){
		   featureArrayToSearch[j][k]["children"].push( [thisLine] );
		   return true;
	       }
	       // a bit paranoid about infinite recursion
	       if ( recursion_level > maximum_recursion_level ){
		   return false;
	       }
	       // recurse if there there are children
	       if ( featureArrayToSearch[j][k]["children"].length > 0 ){
		   if ( recursiveChildSearch(thisLine, featureArrayToSearch[j][k]["children"] )){
		       return true;
		   }
	       }
	   }
       }
       return false;
    }

    var bigDataStruct = {
	"parsedData" : [],
	"parseErrors": [],
	"parseWarnings": [],
    }; // parsed GFF3 in JSON format, to be returned
    
    var lines = gff3String.match(/^.*((\r\n|\n|\r)|$)/gm); // this is wasteful, maybe try to avoid storing split lines separately later
    var hasParent = {}; // child (or grandchild, or whatever) features
    var noParent = {}; // toplevel features without parents

    var seenIDs = [];
    var noParentIDs = [];
    var hasParentIDs = [];

    for (var i = 0; i < lines.length; i++) {

	// check for ##FASTA pragma
	if( lines[i].match(/^##FASTA/) || lines[i].match(/^>/) ){
	    break;
	}
	// skip comment lines
	if( lines[i].match(/^#/) ){
	    continue;
	}
	// skip comment lines
	if( lines[i].match(/^\s*$/) ){
	    continue;
	}
	// make sure lines[i] has stuff in it
	if(typeof(lines[i]) == 'undefined' || lines[i] == null) {
	    continue;
	}
	lines[i] = lines[i].replace(/(\n|\r)+$/, ''); // chomp 
	var fields = lines[i].split("\t");
	// check that we have enough fields
	if(fields.length < 9 ){
	    console.log("Number of fields < 9! Skipping this line:\n\t" + lines[i] + "\n");
	    continue;
	}
	else {
	    if (fields.length > 9 ){
		console.log("Number of fields > 9!\n\t" + lines[i] + "\nI'll try to parse this line anyway.");
	    }
	}

	// parse ninth field into key/value pairs
	var attributesKeyVal = new Object;
	if(typeof(fields[8]) != undefined && fields[8] != null) {
	    var ninthFieldSplit = fields[8].split(/;/);
	    for ( var j = 0; j < ninthFieldSplit.length; j++){
		/* 
		   Multiple attributes of the same type are indicated by separating the
		   values with the comma "," character, as in:
		   Parent=AF2312,AB2812,abc-3
		*/
		var theseKeyVals = ninthFieldSplit[j].split(/\=/);
		if ( theseKeyVals.length >= 2 ){
		    var key = unescape(theseKeyVals[0]);
		    var valArray = new Array;

		    // see if we have multiple values
		    if ( theseKeyVals[1].match(/\,/) ){ // multiple values
			  if ( !! theseKeyVals[1] && theseKeyVals.length != undefined ){
			      // value can be >1 thing separated by comma, for example for multiple parents
			      valArray = theseKeyVals[1].split(/\,/); 
			      console.log("valArray length " + valArray.length);
			      if ( !! valArray && valArray.length != undefined ){
				  for ( k = 0; k < valArray.length; k++){
				      console.log("k: " + k);
				      valArray[k] = unescape(valArray[k]);
				  }
				  
			      }
			      valArray[0] = unescape(valArray[0]);
			      valArray[1] = unescape(valArray[1]);
			  }
		    }
		    else {  // just one value
			valArray[0] = unescape(theseKeyVals[1]);
		    }
		    attributesKeyVal[key] = valArray;
		}
	    }
	}

	var thisLine = {"ID": attributesKeyVal["ID"][0],
			"data": [ 
	                                                        {"rawdata" : fields,
								 "attributes" :  attributesKeyVal
								}
								],
			"children": []
	};
	if ( attributesKeyVal["Parent"] != undefined ){
	    hasParent[attributesKeyVal["ID"]] = thisLine;
	    hasParentIDs.push( attributesKeyVal["ID"] );
	}
	else {
	    noParent[attributesKeyVal["ID"]] = thisLine;
	    noParentIDs.push( attributesKeyVal["ID"] );
	}
	
	// keep track of what IDs we've seen
	if ( isNaN(seenIDs[attributesKeyVal["ID"]]) ){
	    seenIDs[attributesKeyVal["ID"]] = 1;
	}
	else {
	    seenIDs[attributesKeyVal["ID"]]++;
	}
    }

    // put things with no parent in parsedData straight away
    for (var j = 0; j < noParentIDs.length; j++) {
	var thisID = noParentIDs[j];
	var thisLine = noParent[thisID];
	bigDataStruct["parsedData"].push( thisLine );
    }

    // now put children (and grandchildren, and so on) in data struct
    for (var k = 0; k < hasParentIDs.length; k++) {
	// console.log("k: " + k);
	var thisID = hasParentIDs[k];
	var thisLine = hasParent[thisID];
	var thisParentID = thisLine["data"][0]["attributes"]["Parent"];

	if ( isNaN(seenIDs[thisID]) || seenIDs[thisID] == undefined ){ // this is an orphan, shouldn't happen with proper GFF3 files
	    bigDataStruct["parsedData"].push( thisLine );
	}
	else { 
	    // put this child in the right children array, recursively
	    recursiveChildSearch(thisLine, bigDataStruct["parsedData"]);
	}

    }
    return bigDataStruct;
};
