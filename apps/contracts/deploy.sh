#!/bin/bash

starkli deploy\
  $(starkli declare target/dev/contract_strapex_StrapexFactory.contract_class.json | tail -1)\
  0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec\
  $(starkli declare target/dev/contract_strapex_StrapexContract.contract_class.json | tail -1)\
  0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
