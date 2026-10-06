'use strict';

// A genuine load-time failure must still propagate (wrapped) from loadFile.
throw new Error('boom: real load failure');
