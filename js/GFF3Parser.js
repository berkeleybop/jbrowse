/* 
This is a very lightweight and simple GFF3 parser that takes a GFF3 file such as this:

Group1.33	maker	gene	245454	247006	.	+	.	ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137;
Group1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;
Group1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;
Group1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;

and returns a JSON data structure like this:

[{
"parent":
  ["Group1.33","maker","gene","245454","247006",".","+",".","ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137"],
"children": 
  [{
    "parent": 
    ["Group1.33","maker","mRNA","245454","247006",".","+",".","ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259"],
   "children": [
      ["Group1.33","maker","exon","245454","245533",".","+",".","ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA"],
      ["Group1.33","maker","exon","245702","245879",".","+",".","ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA"]
    ]}]
 }
 ... next parent/child/descendants, e.g. gene/mRNA/exons or whatever ...
]

Created by Justin Reese 2012
justaddcoffee@gmail.com
*/

function GFF3toJson() {
}
GFF3toJson.prototype.parse = function(gff3String) {
    // Right now this method assumes that gff3String is the entire GFF3
    // file in string form. This sucks a bit because it means we'll have to 
    // have both the parsed and unparsed GFF3 data in memory which is 
    // a waste of memory and will affect performance when the GFF3 files 
    // are big. We can refactor this later to accept a stream instead of 
    // a string. 
    var parsedData = []; // parsed GFF3 in JSON format, to be returned

    // for each line in string:
    //    if Parent attribute
    //       find Parent in JSON
    //       put into Children array of Parent
    //    else 
    //       put into JSON as Parent without any Children

    var lines = gff3String.match(/^.*((\r\n|\n|\r)|$)/gm);
    for (var i = 0; i < lines.length; i++) {
	// make sure lines[i] has stuff in it
	if(typeof(lines[i]) == 'undefined' || lines[i] == null) {
	    continue;
	}
	lines[i].replace(/(\n|\r)+$/, ''); // chomp 
	var fields = lines[i].split("\t");
	// check that we have enough fields
	if(fields.length < 8 ){
	    console.log("Number of fields < 8! Skipping this line:\n\t" + lines[i] + "\n");
	    continue;
	}
	else {
	    if (fields.length > 8 ){
		console.log("Number of fields > 8!\n\t" + lines[i] + "\nI'll try to parse this line anyway.");
	    }
	}

	// parse ninth field into key/value pairs
	var attributesKeyVal = new Object;
	if(typeof(fields[8]) != undefined && fields[8] != null) {
	    var ninthFieldSplit = fields[8].split(/;/);
	    for ( var j = 0; j < ninthFieldSplit.length; j++){
		var theseKeyVals = ninthFieldSplit[j].split(/\=/);
		if ( theseKeyVals.length == 2 ){
		    attributesKeyVal[theseKeyVals[0]] = theseKeyVals[1];
		}
	    }
	}
	if ( attributesKeyVal["Parent"] != undefined ){
	    // find parent
	    
	}
	else {
 	    // put into JSON as Parent without any Children
	    var thisLine = {"parent": fields, "children": []};
	    parsedData.push( thisLine );
	}
	var foo = "bar";
	var bar = "baz";
	
    }
    return parsedData;
};

	/*
expectedJson = [{
"parent":
["Group1.33","maker","gene","245454","247006",".","+",".","ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137"],
"children": 
 [{
  "parent": 
  ["Group1.33","maker","mRNA","245454","247006",".","+",".","ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259"],
  "children": [
  ["Group1.33","maker","exon","245454","245533",".","+",".","ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA"],
  ["Group1.33","maker","exon","245702","245879",".","+",".","ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA"]]}]}
];
	*/