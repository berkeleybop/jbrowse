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
GFF3toJson.prototype.parse = function(gff3File) {
    // this method uses fileReader, which requires
    // Firefox >= 3.6 || Chrome >= 7 || IE >= 10

    this.gff3File = gff3File; 
    if ( gff3File ) {
	var r = new FileReader();
	var reader=new FileReader();
	/*r.onload = function(e) { 
	  var contents = e.target.result;
	  console.log( "Got the file.n"  + "name: " + gff3File.name + "n" + "type: " + gff3File.type + "n"  +"size: " + gff3File.size + " bytesn"
	  + "starts with: " + contents.substr(1, contents.indexOf("n"))
	  );  
	  }
	*/
	reader.readAsText( gff3File, "UTF-8" );
	console.log("here's what's in the file: " + reader.result)
	null;
    } else { 
	alert("Failed to load file");
    }
    
};

