describe("GFF3Parser", function() { 
	// GFF3toJson takes a GFF3 URL and converts it to an array of hash refs where each
	// hash has a "parent" key/value pair and zero or more "children" key/value pairs, 
	// and the children in turn can have more parent/children. 

	// Some legal GFF3 features not supported by this code yet:
	// - features with multiple parents
	// - features with identical IDs on multiple lines

	// variables for holding fixtures and parsed output
	var gff3Parser;
	var makerGff3String, makerGff3String2, makerGff3String3, makerGff3String4, makerGff3String5, makerGff3String6;
	var jsonOutput, jsonOutput2, jsonOutput3, jsonOutput4, jsonOutput5, jsonOutput6;

	beforeEach(function() {
		gff3Parser = new GFF3Parser();		
		makerGff3String = "Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=this_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246046	246278	.	+	.	ID=1:gnomon_566853_mRNA:exon:5978;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246389	247006	.	+	.	ID=1:gnomon_566853_mRNA:exon:5979;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245702	245759	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA;\n";
		jsonOutput = gff3Parser.parse( makerGff3String );

		makerGff3String2 = "Group1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	gene	245454	247006	.	+	.	ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;";

		jsonOutput2 = gff3Parser.parse( makerGff3String2 );

		makerGff3String3 = "Group1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;metacharacterzoo=%2C%3D%3B%7C%28%29%5B%7B%7D%5E%24%2A%2B%3F%2E%25%26";
		jsonOutput3 = gff3Parser.parse( makerGff3String3 );

		makerGff3String4 = "##gff-version   3\n##FASTA\nGroup1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;";
		jsonOutput4 = gff3Parser.parse( makerGff3String4 );

		makerGff3String5 = "##gff-version   3\n#Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;";
		jsonOutput5 = gff3Parser.parse( makerGff3String5 );

		// here's a fixture with great granchildren. doesn't necessarily make sense biologically, just using this to test parsing of deep features.
		// the deepest I'm going to test is great-great-grandchildren.  
		makerGff3String6 = "Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=this_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA:exon:5976;\nGroup1.33	maker	TF_binding_site	246816	246820	.	+	.	ID=1:gnomon_566853_TFBS;Parent=1:gnomon_566853_mRNA:three_prime_utr;";
		jsonOutput6 = gff3Parser.parse( makerGff3String6 );
	    });

	it("should respond to parse", function() {
		expect(gff3Parser.parse).toBeDefined();
	    });

	it("should return something non-null", function() {
		expect(jsonOutput).not.toBeNull();
	    });

	it("should return non-null 'parsedData' attribute", function() {
		expect(jsonOutput["parsedData"]).not.toBeNull();
	    });

	it("should return non-null 'parsedErrors' attribute", function() {
		expect(jsonOutput["parsedErrors"]).not.toBeNull();
	    });

	it("should return non-null 'parsedWarnings' attribute", function() {
		expect(jsonOutput["parsedWarnings"]).not.toBeNull();
	    });

	it("should return a parent with the right ID in parsed JSON", function() {
		expect(jsonOutput["parsedData"][0]["ID"]).toEqual("this_parent_id_12345");
	    });

	it("should data array of 9 element in parsed JSON", function() {
		expect(jsonOutput["parsedData"][0]["data"]).toBeDefined();
		expect(jsonOutput["parsedData"][0]["data"].length).toEqual(9);
	    });

	it("should correctly parse first field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][0]).toEqual("Group1.33");
		    });
	it("should correctly parse second field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][1]).toEqual("maker");
		    });
	it("should correctly parse third field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][2]).toEqual("gene");
		    });
	it("should correctly parse fourth field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][3]).toEqual("245454");
		    });
	it("should correctly parse five field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][4]).toEqual("247006");
		    });
	it("should correctly parse sixth field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][5]).toEqual(".");
		    });
	it("should correctly parse seventh field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][6]).toEqual("+");
		    });
	it("should correctly parse eighth field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][7]).toEqual(".");
		    });
	it("should correctly parse ninth field of GFF3", function() {
		expect(jsonOutput["parsedData"][0]["data"][8]).toEqual('ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;');
	    });

	it("should correctly parse attributes in ninth field without hex codes", function() {
		expect(jsonOutput3["parsedData"][0]["attributes"]["ID"]).toEqual("1:gnomon_566853_mRNA");
	    });

	it("should correctly parse attributes in ninth field with hex codes", function() {
		expect(jsonOutput3["parsedData"][0]["attributes"]["metacharacterzoo"]).toEqual(',=;|()[{}^$*+?.%&');
	    });

	it("should return children in parsed JSON", function() {
		expect(jsonOutput["parsedData"][0]["children"]).toBeDefined();
	    });

	it("should put child into 'children' array of parent (when parent is seen before child)", function() {
		expect(jsonOutput["parsedData"][0]["children"][0]["ID"]).toEqual("1:gnomon_566853_mRNA");
	    });

	it("should put child into 'children' array of parent (when child is seen before parent)", function() {
		expect(jsonOutput2["parsedData"][0]["children"][0]["ID"]).toEqual("1:gnomon_566853_mRNA");
	    });
	
	it("should put grandchildren into 'children' array of 'children' array of grandparent", function() {
		expect(jsonOutput["parsedData"][0]["children"][0]["children"][0]["ID"]).toEqual("1:gnomon_566853_mRNA:exon:5976");
	    });

	it("should put great-grandchildren into 'children' array of 'children' array of 'children' array of great-grandparent", function() {
		expect(jsonOutput6["parsedData"][0]["children"][0]["children"][0]["children"][0]["ID"]).toEqual("1:gnomon_566853_mRNA:three_prime_utr");
	    });

	it("should put great-great-grandchildren into 'children' array of 'children' array of 'children' array of 'children' array of great-great-grandparent", function() {
		expect(jsonOutput6["parsedData"][0]["children"][0]["children"][0]["children"][0]["children"][0]["ID"]).toEqual("1:gnomon_566853_TFBS");
	    });

	it("should stop parsing at ##FASTA pragma", function() {
		expect(jsonOutput4["parsedData"]).toEqual([]);
	    });

	it("should ignore # lines", function() {
		expect(jsonOutput5["parsedData"]).toEqual([]);
	    });

    });

