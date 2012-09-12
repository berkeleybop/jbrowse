describe("GFF3toJson", function() { 
	// GFF3toJson takes a GFF3 URL and converts it to an array of hash refs where each
	// hash has a "parent" key/value pair and zero or more "children" key/value pairs, 
	// and the children in turn can have more parent/children. 
	var gff3Parser;
	var makerGff3String;
	var makerCorrectJsonFile;
	
	beforeEach(function() {
		gff3Parser = new GFF3toJson();		
		makerGff3String = "Group1.33	maker	gene	245454	247006	.	+	.	ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246046	246278	.	+	.	ID=1:gnomon_566853_mRNA:exon:5978;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246389	247006	.	+	.	ID=1:gnomon_566853_mRNA:exon:5979;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245702	245759	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA;\n";
	    });

	it("1 should be true", function() {
		expect(1).toBeTruthy();
	    });
	
	it("should respond to parse", function() {
		expect(gff3Parser.parse).toBeDefined();
	    });

	it("should return something non-null", function() {
		var parsedJson = gff3Parser.parse( makerGff3String );
		expect(parsedJson).not.toBeNull();
	    });

	it("should return a parent in parsed JSON", function() {
		var parsedJson = gff3Parser.parse( makerGff3String );
		expect(parsedJson).toBeDefined();
		expect(parsedJson[0]).toBeDefined();
		expect(parsedJson[0]["parent"]).toBeDefined();
	    });

	it("should return a parent that is an array of 9 element in parsed JSON", function() {
		var parsedJson = gff3Parser.parse( makerGff3String );
		expect(parsedJson).toBeDefined();
		expect(parsedJson[0]).toBeDefined();
		expect(parsedJson[0]["parent"]).toBeDefined();
		expect(parsedJson[0]["parent"].length).toEqual(9)
	    });

	it("should return children in parsed JSON", function() {
		var parsedJson = gff3Parser.parse( makerGff3String );
		expect(parsedJson).toBeDefined();
		expect(parsedJson[0]).toBeDefined();
		expect(parsedJson[0]["children"]).toBeDefined();
	    });
	
	it("should correctly parse Maker GFF3 file to json", function() {
		var actualJson = gff3Parser.parse( makerGff3String );
		var expectedJson = [{"parent":
				     ["Group1.33","maker","gene","245454","247006",".","+",".","ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137"],
				     "children": 
				     [{
					     "parent": 
					     ["Group1.33","maker","mRNA","245454","247006",".","+",".","ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259"],
					     "children": [
							  ["Group1.33","maker","exon","245454","245533",".","+",".","ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA"],
							  ["Group1.33","maker","exon","245702","245879",".","+",".","ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA"]]}]}
		    ];
		expect(actualJson).toEqual( expectedJson );
	    });
	
    });