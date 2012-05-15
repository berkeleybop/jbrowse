
function AnnotSequenceTrack(config, refSeq, browserParams) {    
    console.log("called AnnotSequenceTrack constructor");
    SequenceTrack.call(this, config, refSeq, browserParams);
}

AnnotSequenceTrack.prototype = new SequenceTrack("");

