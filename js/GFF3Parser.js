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
    // file in string form. This sucks because it means we'll have to 
    // have both the parsed and unparsed GFF3 data in memory which is 
    // a waste of memory and will affect performance when the GFF3 files 
    // are big. We can refactor this later. 
    var json; // to be returned

    // for each line in string:
    //    if Parent attribute
    //       find Parent in JSON
    //       put into Children array of Parent
    //    else 
    //       put into JSON as Parent without any Children

    var lines = gff3String.match(/^.*((\r\n|\n|\r)|$)/gm);
    for (var i = 0; i < lines.length; i++) {
	var fields = lines[i].split("\t");

	// look for Parent attribute in fields[8]
	var attributes = new Hash;
	var attributesKeyVal = fields[8].split(/(?<!\\)\;/);

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

    }
    return json;
};

