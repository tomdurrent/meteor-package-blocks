/**

@module SERO:blocks
*/

/**
The SEROBlocks collection, with some SERO additions.

@class SEROBlocks
@constructor
*/

SEROBlocks = new Mongo.Collection("sero_blocks", { connection: null });

// if(typeof PersistentMinimongo !== 'undefined')
//     new PersistentMinimongo(SEROBlocks);

/**
Gives you reactively the lates block.

@property latest
*/
Object.defineProperty(SEROBlocks, "latest", {
  get: function() {
    return SEROBlocks.findOne({}, { sort: { number: -1 } }) || {};
  },
  set: function(values) {
    var block = SEROBlocks.findOne({}, { sort: { number: -1 } }) || {};
    values = values || {};
    SEROBlocks.update(block._id, { $set: values });
  }
});

/**
Stores all the callbacks

@property _forkCallbacks
*/
SEROBlocks._forkCallbacks = [];

/**
Start looking for new blocks

@method init
*/
SEROBlocks.init = function() {
  if (typeof web3 === "undefined") {
    console.warn(
      "SEROBlocks couldn't find web3, please make sure to instantiate a web3 object before calling SEROBlocks.init()"
    );
    return;
  }

  // clear current block list
  SEROBlocks.clear();

  Tracker.nonreactive(function() {
    observeLatestBlocks();
  });
};

/**
Add callbacks to detect forks

@method detectFork
*/
SEROBlocks.detectFork = function(cb) {
  SEROBlocks._forkCallbacks.push(cb);
};

/**
Clear all blocks

@method clear
*/
SEROBlocks.clear = function() {
  _.each(SEROBlocks.find({}).fetch(), function(block) {
    SEROBlocks.remove(block._id);
  });
};

/**
The global block subscription instance.

@property subscription
*/
var subscription = null;

/**
Update the block info and adds additional properties.

@method updateBlock
@param {Object} block
*/
function updateBlock(block) {
  // reset the chain, if the current blocknumber is 100 blocks less
  if (block.number + 10 < SEROBlocks.latest.number) SEROBlocks.clear();

  block.difficulty = block.difficulty.toString(10);
  block.totalDifficulty = block.totalDifficulty.toString(10);

  web3.ser.getGasPrice(function(e, gasPrice) {
    if (!e) {
      block.gasPrice = gasPrice.toString(10);
      SEROBlocks.upsert(
        "bl_" + block.hash.replace("0x", "").substr(0, 20),
        block
      );
    }
  });
}

/**
Observe the latest blocks and store them in the Blocks collection.
Additionally cap the collection to 50 blocks

@method observeLatestBlocks
*/
function observeLatestBlocks() {
  // get the latest block immediately
  web3.ser.getBlock("latest", function(e, block) {
    if (!e) {
      updateBlock(block);
    }
  });

  // GET the latest blockchain information
  subscription = web3.ser.subscribe("newBlockHeaders", function(error, result) {
    checkLatestBlocks(error, result ? result.hash : null);
  });
}

/**
The observeLatestBlocks callback used in the block subscription.

@method checkLatestBlocks
*/
var checkLatestBlocks = function(e, hash) {
  if (!e) {
    web3.ser.getBlock(hash, function(e, block) {
      if (!e) {
        var oldBlock = SEROBlocks.latest;

        // console.log('BLOCK', block.number);

        // if(!oldBlock)
        //     console.log('No previous block found: '+ --block.number);

        // CHECK for FORK
        if (oldBlock && oldBlock.hash !== block.parentHash) {
          // console.log('FORK detected from Block #'+ oldBlock.number + ' -> #'+ block.number +'!');

          _.each(SEROBlocks._forkCallbacks, function(cb) {
            if (_.isFunction(cb)) cb(oldBlock, block);
          });
        }

        updateBlock(block);

        // drop the 50th block
        var blocks = SEROBlocks.find({}, { sort: { number: -1 } }).fetch();
        if (blocks.length >= 5) {
          var count = 0;
          _.each(blocks, function(bl) {
            count++;
            if (count >= 5) SEROBlocks.remove({ _id: bl._id });
          });
        }
      }
    });
  }
};
