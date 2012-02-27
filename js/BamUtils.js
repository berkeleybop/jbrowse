var BamUtils = { };

BamUtils.START = 0;
BamUtils.END = 1;
BamUtils.STRAND = 2;
BamUtils.ID = 3;
BamUtils.CIGAR = 4;
BamUtils.SUBFEATURES = 5;
BamUtils.fields = {start: 0, 
		   end: 1, 
		   strand: 2, 
		   id: 3, 
		   cigar: 4, 
		   subfeatures: 5 
		  };
BamUtils.subFields = {start: 0, 
		      end: 1, 
		      type: 2};

BamUtils.lazyIndex = 2;
BamUtils.sublistIndex = 6;
//BamUtils.fields = { }
//for (var i=0; i<BamUtils.headers.length; i++)  {
//  BamUtils.fields[BamUtils.headers[i]] = i;
//}

BamUtils.subfeatureClasses =  {
    "M": "cigarM", 
    "D": "cigarD", 
    "N": "cigarN",   
    "=": "cigarEQ",   
    "E": "cigarEQ", 
    "X": "cigarX", 
    "I": "cigarI"
    // not making features for padding(P), soft clip(S), hard clip(H) CIGAR elements
};

/**
 *   Populates subfeatures array of given feature, based on feature's CIGAR string
 *       assumes feature has a CIGAR string
 *   WARNING: replaces any existing subfeatures array
 *   if for some reason there are existing (non-CIGAR based) subfeatures, 
 *       and want to prepend, append, or intermix CIGAR-based subfeats, will need to 
 *       use cigarToSubfeats for finer control 
 */
BamUtils.createSubfeats = function(feat)  {
    // console.log(feat);
    var subfeats = BamUtils.cigarToSubfeats(feat[BamUtils.CIGAR], feat[BamUtils.START]);
    feat[BamUtils.SUBFEATURES] = subfeats;
    return subfeats;
}
/**
 *  take a cigar string, and initial position, return an array of subfeatures
 */
BamUtils.cigarToSubfeats = function(cigar, offset)    {
    var subfeats = [];
    var lops = cigar.match(/\d+/g);   
    var ops = cigar.match(/\D/g);
    // console.log(cigar); console.log(ops); console.log(lops);
    var min = offset;
    var max;
    for (var i = 0; i < ops.length; i++)  {
	var lop = parseInt(lops[i]);  // operation length
	var op = ops[i];  // operation type
	// converting "=" to "E" to avoid possible problems later with non-alphanumeric type name
	if (op === "=")  { op = "E"; }  

	switch (op) {   
	   case 'M':
	   case 'D':
	   case 'N':
	   // case '=':
	   case 'E':
	   case 'X':
	      max = min + lop;
	      break;
	   case 'I':
	      max = min;
	      break;
	    case 'P':  // not showing padding deletions (possibly change this later -- could treat same as 'I' ?? )
	    case 'H':  // not showing hard clipping (since it's unaligned, and offset arg meant to be beginning of aligned part)
	    case 'S':  // not showing soft clipping (since it's unaligned, and offset arg meant to be beginning of aligned part)
	         break;
	    // other possible cases
	}
	var subfeat = [ min, max, op ];
	subfeats.push(subfeat);
	min = max;
    }
    return subfeats;
};

BamUtils.convertBamRecord = function (br, make_cigar_subfeats)  {
    var feat = [];
    // var fields = this.fields;
    // feat[fields.start] = br.pos;
    feat[BamUtils.START] = br.pos;
    // lref calc'd in dalliance/js/bam.js  BamFile.readBamRecords() function
    if (br.lref)  {  // determine length based on CIGAR (lref is calc'd based on CIGAR string)
	feat[BamUtils.END] = br.pos + br.lref;
    }
    else  {  // determin length based on read length (no CIGAR found to calc lref)
	feat[BamUtils.END] = br.pos + br.seq.length;
    }

    //feat[END] = br.pos + br.lref;

    // feat.segment = br.segment;
    // feat.type = 'bam';
    feat[BamUtils.STRAND] = 1; // just calling starnd as forward for now

    // simple ID, just same as readName
    // feat[BamUtils.ID] = br.readName;

    // or possibly uniquify name by combining name, start, end (since read pairs etc. can have same readName):
    feat[BamUtils.ID] = br.readName + "/" + feat[BamUtils.START] + "-" + feat[BamUtils.END];

    // or to really guarantee uniqueness, combine name, start, end, cigar string
    //     since different alignments of same read could have identical start and end, but 
    //     differing alignment in between (and therefore different CIGAR string)
    // feat[BamUtils.ID] = br.readName + "/" + feat[BamUtils.START] + "-" + feat[BamUtils.END] + "/" + feat[BamUtils.CIGAR];

    // feat.notes = ['Sequence=' + br.seq, 'CIGAR=' + br.cigar, 'MQ=' + br.mq];
    // feat.seq = br.seq;  // not having seq field in feat for now
    feat[BamUtils.CIGAR] = br.cigar;   // cigar already translated from int array 
    if (make_cigar_subfeats)  {
	BamUtils.createSubfeats(feat);
    }
    return feat;
};

