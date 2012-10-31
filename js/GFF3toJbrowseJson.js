// Created by Justin Reese 9/2012
// justaddcoffee@gmail.com
//
//After
//Alekseyenko, A., and Lee, C. (2007).
//Nested Containment List (NCList): A new algorithm for accelerating
//   interval query of genome alignment and interval databases.
//Bioinformatics, doi:10.1093/bioinformatics/btl647
//http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

// This code takes a data structure such as that returned by GFF3toJson.js 
// and makes it into an jbrowse-style json with a nested containment list 
// (NClist) suitable for use in WebApollo and possibly Jbrowse. 

function GFF3toJbrowseJson() {
};

GFF3toJbrowseJson.prototype.gff3toJbrowseJson = function(parsedGFF3)  {
    var returnJson = {};
    returnJson["intervals"] = {};

    returnJson["histograms"] = {"stats" : [ {"basesPerBin" : "1000000","max" : 1,"mean" : 1} ],"meta" : [ { "basesPerBin" : "1000000", "arrayParams" : { "length" : 1, "chunkSize" : 10000, "urlTemplate" : "hist-1000000-{Chunk}.json"}}]};

    returnJson["intervals"]["classes"] = 
		   [ {
				    "isArrayAttr" : {
					"Subfeatures" : 1
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
					"Sublist" : 1
				    },
				    "attributes" : [ "Start", "End", "Chunk" ]
		       } ];

    returnJson["intervals"]["lazyClass"] = 2;
    returnJson["intervals"]["urlTemplate"] = "lf-{Chunk}.json";
    returnJson["formatVersion"] = 1;
   
    var jsonUtilObj = new JSONUtils;
    var featureCount = 0;

    //
    // del
    //
    var parser = new GFF3toJson;
    makerGff3String = "Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=this_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246046	246278	.	+	.	ID=1:gnomon_566853_mRNA:exon:5978;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246389	247006	.	+	.	ID=1:gnomon_566853_mRNA:exon:5979;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245702	245759	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	gene	245454	247006	.	+	.	ID=XXXthis_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=XXX1:gnomon_566853_mRNA;Parent=XXXthis_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=XXX1:gnomon_566853_mRNA:exon:5976;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	245702	245879	.	+	.	ID=XXX1:gnomon_566853_mRNA:exon:5977;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246046	246278	.	+	.	ID=XXX1:gnomon_566853_mRNA:exon:5978;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246389	247006	.	+	.	ID=XXX1:gnomon_566853_mRNA:exon:5979;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245454	245533	.	+	.	ID=XXX1:gnomon_566853_mRNA:five_prime_utr;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245702	245759	.	+	.	ID=XXX1:gnomon_566853_mRNA:five_prime_utr;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=XXX1:gnomon_566853_mRNA:cds;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=XXX1:gnomon_566853_mRNA:cds;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=XXX1:gnomon_566853_mRNA:cds;Parent=XXX1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=XXX1:gnomon_566853_mRNA:three_prime_utr;Parent=XXX1:gnomon_566853_mRNA;";
    var twoFeat = parser.parse( makerGff3String );

    // loop through each top level feature in parsedGFF3 and make array of featureArrays
    // jsonUtilObj.convertParsedGFF3JsonToFeatureArray( parsedGFF3 );

    // first check if we have only one feature, in which case parsedData is an object not an array 
    if ( typeof(parsedGFF3.parsedData.length) == 'undefined' ){
	returnJson["featureCount"] = 1
    }
    else {
	returnJson["featureCount"] = twoFeatParsedGFF3.parsedData.length
    }


    return returnJson;
};



