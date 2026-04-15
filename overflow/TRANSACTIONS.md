# Overflow — On-Chain Transaction Hashes

**Chain:** WireFluid Testnet (Chain ID 92533)
**RPC:** https://evm.wirefluid.com
**Explorer:** https://wirefluidscan.com
**Deployer:** 0xE342e5cB60b985ee48E8a44d76b07130D57F5BA8

---

## Deployed Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| TeamTokenFactory | `0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6` | [View](https://wirefluidscan.com/address/0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6) |
| PerformanceOracle | `0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF` | [View](https://wirefluidscan.com/address/0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF) |
| RewardDistributor | `0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68` | [View](https://wirefluidscan.com/address/0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68) |
| UpsetVault | `0xFec31718e8EC8f731Fc23D704E393F448D252DaE` | [View](https://wirefluidscan.com/address/0xFec31718e8EC8f731Fc23D704E393F448D252DaE) |
| CircuitBreaker | `0xF74D8f4159326E0aB055b07E470FAe843300a016` | [View](https://wirefluidscan.com/address/0xF74D8f4159326E0aB055b07E470FAe843300a016) |
| FanWars | `0xC634E9Ec20d9A43D4b546d10216982FE780CbF80` | [View](https://wirefluidscan.com/address/0xC634E9Ec20d9A43D4b546d10216982FE780CbF80) |

## PSL Team Tokens

| Team | Symbol | Token Address | Explorer |
|------|--------|---------------|----------|
| Islamabad United | $IU | `0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e` | [View](https://wirefluidscan.com/address/0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e) |
| Lahore Qalandars | $LQ | `0x66419e794d379E707bc83fd7214cc61F11568e4b` | [View](https://wirefluidscan.com/address/0x66419e794d379E707bc83fd7214cc61F11568e4b) |
| Multan Sultans | $MS | `0x9AF925e33F380eEC57111Da8ED13713afD0953D8` | [View](https://wirefluidscan.com/address/0x9AF925e33F380eEC57111Da8ED13713afD0953D8) |
| Karachi Kings | $KK | `0x6D36f154e3b3232a63A6aC1800f02bA233004490` | [View](https://wirefluidscan.com/address/0x6D36f154e3b3232a63A6aC1800f02bA233004490) |
| Peshawar Zalmi | $PZ | `0x5f9B45874872796c4b2c8C09ECa7883505CB36A8` | [View](https://wirefluidscan.com/address/0x5f9B45874872796c4b2c8C09ECa7883505CB36A8) |
| Quetta Gladiators | $QG | `0xC9BC62531E5914ba2865FB4B5537B7f84AcE1713` | [View](https://wirefluidscan.com/address/0xC9BC62531E5914ba2865FB4B5537B7f84AcE1713) |
| Hyderabad Kingsmen | $HK | `0x96fC2D2B5b6749cD67158215C3Ad05C81502386A` | [View](https://wirefluidscan.com/address/0x96fC2D2B5b6749cD67158215C3Ad05C81502386A) |
| Rawalpindiz | $RW | `0xC137B2221E8411F059a5f4E0158161402693757E` | [View](https://wirefluidscan.com/address/0xC137B2221E8411F059a5f4E0158161402693757E) |

---

## E2E Test Transactions

### Run 1 — Initial E2E

**Test wallet:** 0x8F69B23b954C165A2551De75864AD7f7b9a2b8Af

| Action | Tx Hash |
|--------|---------|
| Fund wallet | [`0x80a43e83...ed865064`](https://wirefluidscan.com/tx/0x80a43e83b02fd6510bc0cd9f8dd4565bad37c7b53cd0592e61cc49f4ed865064) |
| Buy IU (0.1 WIRE → 77.13 $IU) | [`0xe48eaebe...4b9692b0`](https://wirefluidscan.com/tx/0xe48eaebe93d514729db71e457ff9b8b4bae3ad122328af092190d32b4b9692b0) |
| Sell half IU (38.57 $IU → 0.04 WIRE) | [`0x58bebaae...9792c247`](https://wirefluidscan.com/tx/0x58bebaaea89df72b127b643ef38bd1a844a5557398a48f7f100269c99792c247) |

### Run 2 — Post-Audit E2E

| Action | Tx Hash |
|--------|---------|
| Buy IU (0.01 WIRE → 7.68 $IU) | [`0x38f4b11c...8985717f`](https://wirefluidscan.com/tx/0x38f4b11c1bb03076071af8bf5f409bd8f43029e40cc1318ce0f650f08985717f) |
| Sell half IU (3.84 $IU) | [`0xe96cc80f...7e8c8561`](https://wirefluidscan.com/tx/0xe96cc80f21cd2f2c5a20694a9297e4782c5b1c498eabe75bdda00ce67e8c8561) |

---

### Run 3 — Stress Test (157 ops)

**WIRE spent:** 0.503277826040868483
**Result:** 138 pass / 19 fail

<details>
<summary>39 on-chain transaction hashes</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Buy IU (0.01 WIRE) | [`0xe09b0281...3c7dfcb8`](https://wirefluidscan.com/tx/0xe09b02816c19b5be94443e47f684c366bb0db94988be6f9b75ee3ae73c7dfcb8) |
| 2 | Approve IU | [`0x23099c3c...52aa89af`](https://wirefluidscan.com/tx/0x23099c3c3001dc602904a079e48032f025e79e1de46327439c0a313952aa89af) |
| 3 | Sell half IU (5.651637586914830325) | [`0x9930d9e0...c8bbeb2b`](https://wirefluidscan.com/tx/0x9930d9e06e9352109ee76787215874d69b55c19b1946930b3c9b69b9c8bbeb2b) |
| 4 | LQ micro-buy #1 | [`0x630af7a8...21af0dc3`](https://wirefluidscan.com/tx/0x630af7a8898f6ecbf77e45614d15a9bf620822c7ac72b247e74c9aa821af0dc3) |
| 5 | LQ micro-buy #2 | [`0x280d2388...1470fa22`](https://wirefluidscan.com/tx/0x280d23886d48df2548d9198d1db5aa6505e4e3d916bbb2dd016c763c1470fa22) |
| 6 | LQ micro-buy #3 | [`0xce018714...74753805`](https://wirefluidscan.com/tx/0xce0187140dd5e3b4f7b64a58f65a4d8b8c8673a75be0ea768a67514074753805) |
| 7 | LQ micro-buy #4 | [`0x55ea8fea...3bcd59c3`](https://wirefluidscan.com/tx/0x55ea8fea55f183be8cea714ea465f8ced96b2cbe3def6b3552bddd453bcd59c3) |
| 8 | LQ micro-buy #5 | [`0x678c875e...6a9b9435`](https://wirefluidscan.com/tx/0x678c875e18593c8e53987470ecd4dbf5491e3f05dc278b712c43043a6a9b9435) |
| 9 | LQ micro-buy #6 | [`0x9b4b209d...6cc50748`](https://wirefluidscan.com/tx/0x9b4b209d704e18c34890b8984e1cf17ffc1adf917efede4caf0bc62e6cc50748) |
| 10 | LQ micro-buy #7 | [`0x18c43717...8daa6643`](https://wirefluidscan.com/tx/0x18c437175ee082558b77ac49da6e29f3fcc3100935932afb7c6e143f8daa6643) |
| 11 | LQ micro-buy #8 | [`0x2a61d95e...334e0a34`](https://wirefluidscan.com/tx/0x2a61d95e06a0bbb2c6e6f99a111975614de74e3556b5de185f654090334e0a34) |
| 12 | LQ micro-buy #9 | [`0x5fc0c357...e9946b4e`](https://wirefluidscan.com/tx/0x5fc0c3572efc55def727b9303b82fb4f83ff99a2d67917a2cee21768e9946b4e) |
| 13 | LQ micro-buy #10 | [`0x877992a6...98672f55`](https://wirefluidscan.com/tx/0x877992a6d642df6e2316c1f0df8318fa4fb2639c63bf7ed91ac0bd5d98672f55) |
| 14 | Approve IU (full) | [`0x619bab7c...46a45547`](https://wirefluidscan.com/tx/0x619bab7c0ce3e5103c3a261b3656a4a99e56f5f3ee2d4c74e87f345146a45547) |
| 15 | Approve LQ (full) | [`0x556c2808...d70b9c95`](https://wirefluidscan.com/tx/0x556c2808e52ae03b40997a6ff8a7bca2e2056454ace0c3fef58c68e9d70b9c95) |
| 16 | Sell all LQ (18.976596573708322159) | [`0xac56fd24...6e710ce2`](https://wirefluidscan.com/tx/0xac56fd2438ae0323fb7b9b68957620daa2ac12109aeb0ad19018a7746e710ce2) |
| 17 | R1 Buy LQ | [`0x47a2a794...8a4b7c45`](https://wirefluidscan.com/tx/0x47a2a7946ca0eb35af2e43bf0f7437bb610dc67203925c0ecc7882488a4b7c45) |
| 18 | R1 Buy MS | [`0x042d4772...e7af7ed0`](https://wirefluidscan.com/tx/0x042d477237c4c4bec9a0ee4579f94b2006ad324273699acd65056cede7af7ed0) |
| 19 | R1 Buy KK | [`0x25f3e21e...65e09857`](https://wirefluidscan.com/tx/0x25f3e21e1e9479f29bb978518e94df4fce0ab4c9ba0a247d92f798ed65e09857) |
| 20 | R1 Buy PZ | [`0x8d689660...033e74a9`](https://wirefluidscan.com/tx/0x8d6896604d5b501b9312f124986c6123f2e799ad549c046ac6a0c2e8033e74a9) |
| 21 | R1 Buy QG | [`0xd44c97d2...77ac3219`](https://wirefluidscan.com/tx/0xd44c97d24f2a87dd56ac46a3f14a9004bc7d31272acfdb46d7ec8f3577ac3219) |
| 22 | R1 Buy HK | [`0xd05a7b29...5674f958`](https://wirefluidscan.com/tx/0xd05a7b29d783f0c68a8833eedabca20cce70013d6c35d1ef26e22eb75674f958) |
| 23 | R1 Buy RW | [`0x359ee437...2f4f620b`](https://wirefluidscan.com/tx/0x359ee437f969dada638c31ce46c9aa9914a8dcbd066b330acaf873712f4f620b) |
| 24 | R2 Buy IU | [`0xdad6ce31...a1d8ecc5`](https://wirefluidscan.com/tx/0xdad6ce3130d909e0c61504716482767b49ca63eafbd39fafc1b0c7aaa1d8ecc5) |
| 25 | R2 Buy LQ | [`0xf2538188...fdbebbc2`](https://wirefluidscan.com/tx/0xf25381887d5ba349c57acdac5f337ff66c5fe84f8cf238743fa3dd23fdbebbc2) |
| 26 | R2 Buy MS | [`0x90ace5f3...e63239c9`](https://wirefluidscan.com/tx/0x90ace5f3c4d23f180e2b5f23546ac32a2e82440cbca417b4434fbd22e63239c9) |
| 27 | R2 Buy KK | [`0xf1a141b7...56b7f606`](https://wirefluidscan.com/tx/0xf1a141b714d2696c0c66066b47f9df7c99b970340b69fd1e51b36e6556b7f606) |
| 28 | R2 Buy PZ | [`0x63ea5124...d4046525`](https://wirefluidscan.com/tx/0x63ea5124cff8b1d3fa1cfbcad4f45d5d438b94ac5abda8fdb81216b0d4046525) |
| 29 | R2 Buy QG | [`0xa0df4b28...c90e2bf1`](https://wirefluidscan.com/tx/0xa0df4b284cb5c8d97dd02ac3eea5e1bc56b8dbf50bac255617bf544dc90e2bf1) |
| 30 | R2 Buy HK | [`0xfba53237...1aadb78b`](https://wirefluidscan.com/tx/0xfba532374ead7a19b127fb3c1c0552708f8a5b53662fdc6cbcfa02df1aadb78b) |
| 31 | R2 Buy RW | [`0x13a2adb7...b52df3d0`](https://wirefluidscan.com/tx/0x13a2adb7f47ae51f1d46c9dd0dce9c8fa09f0ee26c8111f06caf5afdb52df3d0) |
| 32 | R3 Buy IU | [`0x497267c8...8b606673`](https://wirefluidscan.com/tx/0x497267c80af5af3468f67c4a0ed6906c4e5b3e437faab04438ac510a8b606673) |
| 33 | R3 Buy LQ | [`0x8f7e2d99...baa3274c`](https://wirefluidscan.com/tx/0x8f7e2d994bf63055ad8ed8f161535d056cf3ca41f21211b829734636baa3274c) |
| 34 | R3 Buy MS | [`0x63eb497c...ba780f7a`](https://wirefluidscan.com/tx/0x63eb497c3676c92cb2b8ab656c8a0a6a75f71de0e188d575183c1606ba780f7a) |
| 35 | R3 Buy KK | [`0x8932666f...a9796ce3`](https://wirefluidscan.com/tx/0x8932666f5104edf94225ab19ebc7998dcbfc0e1fb06ce6751cbe0fcaa9796ce3) |
| 36 | R3 Buy PZ | [`0x7abaa7ec...ff97fe44`](https://wirefluidscan.com/tx/0x7abaa7ec3388aee5b35339ebbccf3ed9c48b2d989559252bc49e70fbff97fe44) |
| 37 | R3 Buy QG | [`0x55738d7a...b4c0f275`](https://wirefluidscan.com/tx/0x55738d7a43ea827f9edf989be5e83c22994068ac124e61b353a609c3b4c0f275) |
| 38 | R3 Buy HK | [`0x50e22a24...d7ca5f3c`](https://wirefluidscan.com/tx/0x50e22a245fa91da8fd87509ee4555d3391038147d837c3894aa011a5d7ca5f3c) |
| 39 | R3 Buy RW | [`0x962348a9...fe9c5e23`](https://wirefluidscan.com/tx/0x962348a91f2e7683286b06e8979bf9d7dee7cb1f089d5b6b2123d1affe9c5e23) |

</details>

---

### Run 4 — MEGA Stress Test (993 ops)

**WIRE spent:** 4.41184706435542875
**Result:** 920 pass / 73 fail (823 on-chain txs)

<details>
<summary>S10 — Variable-size buys (37 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Buy LQ (0.001) | [`0x14df8604...5d01197a`](https://wirefluidscan.com/tx/0x14df86041d0ae985f2203377e512bef520361fe81e1acc37eb65ff655d01197a) |
| 2 | Buy MS (0.001) | [`0xda30c8b6...b5adc783`](https://wirefluidscan.com/tx/0xda30c8b67598e8a6bafb2ead9e318fb46b64796e9d369f25d411557ab5adc783) |
| 3 | Buy KK (0.001) | [`0x5f389be4...d778e3dc`](https://wirefluidscan.com/tx/0x5f389be44f59ea047b86617b6c2802268108b8e618074725793a13a2d778e3dc) |
| 4 | Buy PZ (0.001) | [`0xa1f38f38...dd33764e`](https://wirefluidscan.com/tx/0xa1f38f38c557c814d39200626bc265e2f1bea28da99b24ee92a4189fdd33764e) |
| 5 | Buy QG (0.001) | [`0xe991937c...4c0d2884`](https://wirefluidscan.com/tx/0xe991937cf92724b3508fd32ee0b7e7cfab7d34647d7207515f6246864c0d2884) |
| 6 | Buy HK (0.001) | [`0x3b8f287e...b7b4f12c`](https://wirefluidscan.com/tx/0x3b8f287ed4e5c47289dd3a0f31a4a77cae205a8399cbf09a38e5d318b7b4f12c) |
| 7 | Buy RW (0.001) | [`0xf683babe...e0c8e1db`](https://wirefluidscan.com/tx/0xf683babe7352d21d2f5dc7bbc59fcc77e5f250d3fa7a1a5bffa49392e0c8e1db) |
| 8 | Buy LQ (0.002) | [`0xdac584fb...111fa3da`](https://wirefluidscan.com/tx/0xdac584fba661d5f06e41f19f5ba5c8c2befbb788a21570751d659b51111fa3da) |
| 9 | Buy MS (0.002) | [`0x6b28a218...f38201f6`](https://wirefluidscan.com/tx/0x6b28a2186213cea063b607b77f0f145c216bce9b9e7415cb134cd928f38201f6) |
| 10 | Buy KK (0.002) | [`0xdffe94b4...c1b8ea0f`](https://wirefluidscan.com/tx/0xdffe94b45a5aea08a11b4bced3824114bde7f85d3717e3acdfa31df7c1b8ea0f) |
| 11 | Buy PZ (0.002) | [`0xa5d0614d...1ddcce9f`](https://wirefluidscan.com/tx/0xa5d0614de7faea8a3f6a4328a2741426815c0eb69c198c46bdb2e2c31ddcce9f) |
| 12 | Buy QG (0.002) | [`0x0b7f6ab4...000499da`](https://wirefluidscan.com/tx/0x0b7f6ab42e200c56897fc9fb91a7977837c41be8928db12b29f9d1bb000499da) |
| 13 | Buy HK (0.002) | [`0x1a81fac7...28ec5929`](https://wirefluidscan.com/tx/0x1a81fac794ecf0ee531583354f197e8323dc6d0e84867c206c70487928ec5929) |
| 14 | Buy RW (0.002) | [`0x2f057e0b...0c60cb81`](https://wirefluidscan.com/tx/0x2f057e0bbd9d36ca97394b369073846516e2e2c97ca0af2aebccedb80c60cb81) |
| 15 | Buy LQ (0.003) | [`0x54bc7398...6b637fa0`](https://wirefluidscan.com/tx/0x54bc7398f3583593d6d81cf27fb6cfe2ab9682c761c11aee04d5fd876b637fa0) |
| 16 | Buy MS (0.003) | [`0x54ce6db4...1be9372a`](https://wirefluidscan.com/tx/0x54ce6db498c992dc807e892da2eee439821c37bcf912f2f81e8fe02a1be9372a) |
| 17 | Buy KK (0.003) | [`0x34723864...bd6a9c2c`](https://wirefluidscan.com/tx/0x34723864a14e8725548a31d5ceea0ae9c3dcf5d461016468fd2abebbbd6a9c2c) |
| 18 | Buy PZ (0.003) | [`0x493adfbe...16244176`](https://wirefluidscan.com/tx/0x493adfbef00d2f928f536deb82c1cefc3b656fa453be72b9e3f414ec16244176) |
| 19 | Buy QG (0.003) | [`0xac78089d...f0e68761`](https://wirefluidscan.com/tx/0xac78089d8283b9d6be7dce99e41605fd4efb4297b98590241b38c0acf0e68761) |
| 20 | Buy HK (0.003) | [`0x128a9d7f...74d733c5`](https://wirefluidscan.com/tx/0x128a9d7f00c8ddf9f06360d09e13820cc8936528f08976acda0e6d0574d733c5) |
| 21 | Buy RW (0.003) | [`0x82570634...c0c0c10f`](https://wirefluidscan.com/tx/0x82570634416c8b39e657c9853f7ea566e6b7d55b1fbf9331b2a63525c0c0c10f) |
| 22 | Buy IU (0.005) | [`0x63b71df8...8c87df2c`](https://wirefluidscan.com/tx/0x63b71df82371381f887d9c7b1abfe35de7c7a8f55f0bd46d0197ad6e8c87df2c) |
| 23 | Buy LQ (0.005) | [`0x4845bb43...96d25e73`](https://wirefluidscan.com/tx/0x4845bb433bea6062cd16aef3fc5edff00e87045b5bcbf4461313774f96d25e73) |
| 24 | Buy MS (0.005) | [`0x9984793e...baf365f8`](https://wirefluidscan.com/tx/0x9984793e277137c4ce1d2dd647ad1ccddffee84d50cda4557e469850baf365f8) |
| 25 | Buy KK (0.005) | [`0x6ed436cd...e2ab8686`](https://wirefluidscan.com/tx/0x6ed436cd8fa24115e9cd9061ebb10b40791728d2a4d71acf2f36020ae2ab8686) |
| 26 | Buy PZ (0.005) | [`0xfd3ec08a...1af100a3`](https://wirefluidscan.com/tx/0xfd3ec08a46d71b409a7519ef26108abbdb44a80725101f825ec4d28c1af100a3) |
| 27 | Buy QG (0.005) | [`0x7a1c7f04...2a77ed91`](https://wirefluidscan.com/tx/0x7a1c7f0448466bf244d47658766aec2cdd22ef12dbb7eb005016f00d2a77ed91) |
| 28 | Buy HK (0.005) | [`0x3b627541...96ca3b02`](https://wirefluidscan.com/tx/0x3b6275415a38f504304ebf0e9f3696228ebd14f14ad52857379ccf0796ca3b02) |
| 29 | Buy RW (0.005) | [`0x37ab0d08...59db5331`](https://wirefluidscan.com/tx/0x37ab0d08660cb80effd6841603edfe92cc48ee0f0bc517b6ae835d8c59db5331) |
| 30 | Buy IU (0.008) | [`0xe4c4d420...9e5fa89f`](https://wirefluidscan.com/tx/0xe4c4d42027ea5c2834fa46432ade04767dd75049d9c9a18259002c4e9e5fa89f) |
| 31 | Buy LQ (0.008) | [`0xf066ddf6...82ed254c`](https://wirefluidscan.com/tx/0xf066ddf6fda82da84d4cbab069ea171707cf75e2b08f9a54eb5bb24282ed254c) |
| 32 | Buy MS (0.008) | [`0xaf40b053...f32c1c64`](https://wirefluidscan.com/tx/0xaf40b0537d9695e6e6f7c0cd70525e0af6e722ac1298790c07dc5627f32c1c64) |
| 33 | Buy KK (0.008) | [`0x14eaaf2a...f77c3dff`](https://wirefluidscan.com/tx/0x14eaaf2a7366a3e91d58c5caea0275a4fbc48f5f82f6ed085b4689dcf77c3dff) |
| 34 | Buy PZ (0.008) | [`0xd224598b...57e9a668`](https://wirefluidscan.com/tx/0xd224598ba763404f1233d95f60a9dea3a62850dea597075f705535d757e9a668) |
| 35 | Buy QG (0.008) | [`0x6669e32c...fefbc2de`](https://wirefluidscan.com/tx/0x6669e32c53c8037f30d209f4a18d8baf28d0c9e314db4af26cffc891fefbc2de) |
| 36 | Buy HK (0.008) | [`0x6638bd8b...e3b2fe2f`](https://wirefluidscan.com/tx/0x6638bd8b8c566157b2eb85beff9a4c1e75187494141a94f35edbbbfce3b2fe2f) |
| 37 | Buy RW (0.008) | [`0x8863c808...898d96fe`](https://wirefluidscan.com/tx/0x8863c808fab4414a14c690cccf5bbb68a3366bf69be269a53fc5c008898d96fe) |

</details>

<details>
<summary>S11 — Cleanup sell all (16 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Appr IU | [`0xe18b92f2...cab2dbee`](https://wirefluidscan.com/tx/0xe18b92f25255823be543e5b369d17398ed341d6742f5318180dede20cab2dbee) |
| 2 | Sell IU | [`0x31d548a9...b4a35150`](https://wirefluidscan.com/tx/0x31d548a9bcf5c44aed1c10d2b2b4e89b9add549a55255753c8074ad8b4a35150) |
| 3 | Appr LQ | [`0x644c350e...9f77b191`](https://wirefluidscan.com/tx/0x644c350e1c11cfd18a70214e89d8691d771f3294369edebf963976459f77b191) |
| 4 | Sell LQ | [`0xf95c7aba...62dd27ca`](https://wirefluidscan.com/tx/0xf95c7abad17873e696a085c1f5c8b1482d2d759a43e0e251bdc5c76962dd27ca) |
| 5 | Appr MS | [`0x64ce37a5...11f2d1db`](https://wirefluidscan.com/tx/0x64ce37a5a645ada5075817f93a8edd8cd7926acf24a4315da227661911f2d1db) |
| 6 | Sell MS | [`0x370b6fc3...0827c534`](https://wirefluidscan.com/tx/0x370b6fc37ad61c65e14a6b611d3b71ead4ba9bee1f24226636ee6ee80827c534) |
| 7 | Appr KK | [`0x63038620...0a3d4cb1`](https://wirefluidscan.com/tx/0x630386206a65b8dc0e981fccd516047b7a0f7387ab0e07705cf0d5400a3d4cb1) |
| 8 | Sell KK | [`0x355101a2...dcfc58ce`](https://wirefluidscan.com/tx/0x355101a2f4e58bb33a59d05571df092b0ec9ca1db33645d99af13a05dcfc58ce) |
| 9 | Appr PZ | [`0xbd27da4e...6166fc85`](https://wirefluidscan.com/tx/0xbd27da4eebd102515855e5f56cc15dfe5d5552a6978ce4dbd1267ec46166fc85) |
| 10 | Sell PZ | [`0x2cf5011a...5ff738bc`](https://wirefluidscan.com/tx/0x2cf5011a8f50054ce638c2abcdbe90333252aa52f3d473f2b05b145f5ff738bc) |
| 11 | Appr QG | [`0x214b0787...18dabcf3`](https://wirefluidscan.com/tx/0x214b0787fd25dbbd81ce6d6552115c24e6987362e282b9e4a213cd1218dabcf3) |
| 12 | Sell QG | [`0xb6371255...3070a011`](https://wirefluidscan.com/tx/0xb6371255e28ebbe1cd5910131c26f02949455d3c5e87eb345af2234e3070a011) |
| 13 | Appr HK | [`0x7b15b979...8b114621`](https://wirefluidscan.com/tx/0x7b15b979ac15d9418679f26106b2c053bc861b947679d44505ecbf758b114621) |
| 14 | Sell HK | [`0x6c2c4fc2...4aa78920`](https://wirefluidscan.com/tx/0x6c2c4fc220ba8187f2318307d105a65b564ac9dd70fb8090c28282cc4aa78920) |
| 15 | Appr RW | [`0xec16c63f...7744b7b3`](https://wirefluidscan.com/tx/0xec16c63fb1573942070ab91a4aff83a8609402558047969534d305787744b7b3) |
| 16 | Sell RW | [`0xa04d3d64...5ef7b6e0`](https://wirefluidscan.com/tx/0xa04d3d64425019d5f2925b31abaa16c075ebe65a9810176bbd76d3eb5ef7b6e0) |

</details>

<details>
<summary>S12 — Massive spree 20 rounds x 8 tokens (157 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Sp1 LQ | [`0xbfc4ff3a...f4252b75`](https://wirefluidscan.com/tx/0xbfc4ff3a2044b3ca75f2823a4203f9fcb4f97bc1fe2367500652e568f4252b75) |
| 2 | Sp1 MS | [`0x7875954f...4fd94d43`](https://wirefluidscan.com/tx/0x7875954f58288640c9395cd533630ad4202dd1c4abbc0813dc89f2c64fd94d43) |
| 3 | Sp1 KK | [`0x45ab2eb2...85ae38af`](https://wirefluidscan.com/tx/0x45ab2eb227b2163df7552b3eda89feeb311cd90962cc2e11f2f72ebf85ae38af) |
| 4 | Sp1 PZ | [`0x15d2e5a9...6c1ccc5f`](https://wirefluidscan.com/tx/0x15d2e5a9bb8aff9af4d05169a7a8f590d2738ede7234eb3bf244cd106c1ccc5f) |
| 5 | Sp1 QG | [`0x9e12099c...e61fedcc`](https://wirefluidscan.com/tx/0x9e12099c250dd3eb3da6529ffbb657ee5f3b09c3a5b38fb41cdd7e9fe61fedcc) |
| 6 | Sp1 HK | [`0x0f50f29d...4ba345a8`](https://wirefluidscan.com/tx/0x0f50f29d1c87531821cb0a368d2bf1163cc2c2ffcad0768719df90294ba345a8) |
| 7 | Sp1 RW | [`0xcff5b93c...e6b0c3cc`](https://wirefluidscan.com/tx/0xcff5b93c62474977f7fc6f3a340610862eb39d9830990ac9abb6d53be6b0c3cc) |
| 8 | Sp2 LQ | [`0x9aa7b423...0a19a21b`](https://wirefluidscan.com/tx/0x9aa7b42346ab3ad9c2c00cfad5a9fde8c4d0147ff9e631859b3fdade0a19a21b) |
| 9 | Sp2 MS | [`0xfe3b49df...7b4136e2`](https://wirefluidscan.com/tx/0xfe3b49dfa80e6f5752f632ca4696321206ca290a2e1391f38a2380487b4136e2) |
| 10 | Sp2 KK | [`0x68990ed6...683d1d0c`](https://wirefluidscan.com/tx/0x68990ed651f728eb0ac90b8b1e01ebc0cc137ecc22cf641375651d83683d1d0c) |
| 11 | Sp2 PZ | [`0xec8bbcc6...8bc4af92`](https://wirefluidscan.com/tx/0xec8bbcc69ecdbeac5d09c733db0e303eca945391dfbed18e08f88d0c8bc4af92) |
| 12 | Sp2 QG | [`0x1f547070...0c6d8ac4`](https://wirefluidscan.com/tx/0x1f547070423a328914d94163c13241471c1995fdcc8486e5e403ebd40c6d8ac4) |
| 13 | Sp2 HK | [`0xdf8a0695...ac3fdfcc`](https://wirefluidscan.com/tx/0xdf8a0695323b9490f89cf21a632817cedf9726a5d29a6452e4127fceac3fdfcc) |
| 14 | Sp2 RW | [`0x127c987d...af32f31a`](https://wirefluidscan.com/tx/0x127c987deea3b8bbaecd371d52030bb579f87e1c2826174f106ababeaf32f31a) |
| 15 | Sp3 LQ | [`0x9b278a6e...732ce56c`](https://wirefluidscan.com/tx/0x9b278a6ead95bb853acf9af34f9e40bdab8a2d5a1ab5c366ee923a54732ce56c) |
| 16 | Sp3 MS | [`0x2edb5407...ddb42bac`](https://wirefluidscan.com/tx/0x2edb5407dfccc0bb0563bae644db0b69fa15ce8e09802ce337ab2feeddb42bac) |
| 17 | Sp3 KK | [`0x602db80e...cc49fec8`](https://wirefluidscan.com/tx/0x602db80e77869e23669d31687757d8faf428d1cf22642f8a89642e1ecc49fec8) |
| 18 | Sp3 PZ | [`0x495f4fe0...948a5282`](https://wirefluidscan.com/tx/0x495f4fe043603e5d3281afe84f647a594f9e791f3311c94030dc57cf948a5282) |
| 19 | Sp3 QG | [`0x68271eda...c33ff177`](https://wirefluidscan.com/tx/0x68271edaba8b5bc256221aed9b0ced24b689b067b2730faa06c35935c33ff177) |
| 20 | Sp3 HK | [`0xd97ecb99...0e43eecf`](https://wirefluidscan.com/tx/0xd97ecb99936065496980c142dd50bfa2a649f779c62dcfd9fd8e6aed0e43eecf) |
| 21 | Sp3 RW | [`0x25dde16a...8aaf818f`](https://wirefluidscan.com/tx/0x25dde16a3cea0e2d88fb138c562fe34f89225da983339aba3093a7cb8aaf818f) |
| 22 | Sp4 IU | [`0x440f9f6b...b7962586`](https://wirefluidscan.com/tx/0x440f9f6be9a98b00d5fb1a414955b6b6c969ac6066e98c5246539b9cb7962586) |
| 23 | Sp4 LQ | [`0xe299bfb4...884150be`](https://wirefluidscan.com/tx/0xe299bfb43b63cbc5d3d4d36b02e7e3dd69f7beac94768ef4d4a093c7884150be) |
| 24 | Sp4 MS | [`0x37548790...51af8805`](https://wirefluidscan.com/tx/0x37548790c6fb28d040a20722c600acfb2be1fd0a59e839ddbb8ddd7551af8805) |
| 25 | Sp4 KK | [`0xf21a132a...a965c1b2`](https://wirefluidscan.com/tx/0xf21a132a9545c267ca88eabc2243bce2d435406085bae5614652ac13a965c1b2) |
| 26 | Sp4 PZ | [`0x96b716d0...034787b5`](https://wirefluidscan.com/tx/0x96b716d0a55dd2b75ddb846e4f3c26b205cb52a5f0f3353ca3c1982a034787b5) |
| 27 | Sp4 QG | [`0x9ddbf18d...6990d4bd`](https://wirefluidscan.com/tx/0x9ddbf18d8439c7ca3e1bcdf991dafe2a83c17ead25d9c8578628a8ab6990d4bd) |
| 28 | Sp4 HK | [`0xd1e68edd...0025ed23`](https://wirefluidscan.com/tx/0xd1e68eddbcbc0049ab0ed74491cedc4d99a13d261acd173b4f38b21b0025ed23) |
| 29 | Sp4 RW | [`0xad9efc58...23ca7a9b`](https://wirefluidscan.com/tx/0xad9efc58b975a4680ef82a06d5df8e0c93442527fdb2ccdbf20c270b23ca7a9b) |
| 30 | Sp5 IU | [`0x591d6578...5484e9bb`](https://wirefluidscan.com/tx/0x591d6578cb1c488d88406070dccc64e551ddd679bdd34449cbad43245484e9bb) |
| 31 | Sp5 LQ | [`0xb5897b73...f3b3c9a9`](https://wirefluidscan.com/tx/0xb5897b73891d46d29f1aed4021971e8c77831b4e89897ebbf7c689dcf3b3c9a9) |
| 32 | Sp5 MS | [`0x7b02c3df...ed99af73`](https://wirefluidscan.com/tx/0x7b02c3df9adbc03cfddfe7d747bebb306173fed4b06a15776575dedded99af73) |
| 33 | Sp5 KK | [`0x34e759eb...952dfec1`](https://wirefluidscan.com/tx/0x34e759eb3a3c5b0c29a47f0ce4dba410b167057c2698b29e26cb2191952dfec1) |
| 34 | Sp5 PZ | [`0xd5592991...44211877`](https://wirefluidscan.com/tx/0xd5592991f0b42ff6376bf95c8e9fc4dd7a989a3a35ccc881384c488344211877) |
| 35 | Sp5 QG | [`0x597cddcd...edca4d90`](https://wirefluidscan.com/tx/0x597cddcd88dab854429f29df1f5160de98249a0317acab5ad7a2e372edca4d90) |
| 36 | Sp5 HK | [`0x504d77fb...b1496cda`](https://wirefluidscan.com/tx/0x504d77fbc5fdd2cb2acc1b4ea7e52ed8f095cd49e06e90a87b1fc036b1496cda) |
| 37 | Sp5 RW | [`0xce2ca13c...891fd057`](https://wirefluidscan.com/tx/0xce2ca13c9043635b1f66506599f1b693ba1755df937d5ce2e4035d05891fd057) |
| 38 | Sp6 IU | [`0xa5b40d32...7468a912`](https://wirefluidscan.com/tx/0xa5b40d32cdf33cab8d90de8bc4319adf6e78a3d1bb9a78012a7ae15b7468a912) |
| 39 | Sp6 LQ | [`0x8989c67f...bb1120a7`](https://wirefluidscan.com/tx/0x8989c67f6935c402a1480c765f145e1b828e470af7c3b683353bed00bb1120a7) |
| 40 | Sp6 MS | [`0xbd89d5dd...289fc0a5`](https://wirefluidscan.com/tx/0xbd89d5dd492c4b6ec808491643759deb8fc609792a57d48a62351c4a289fc0a5) |
| 41 | Sp6 KK | [`0x6ee3da22...54c7adb0`](https://wirefluidscan.com/tx/0x6ee3da22a09f8582d0556c6cd98025ed32c462c79509a6fedf10fd6754c7adb0) |
| 42 | Sp6 PZ | [`0x6477ffd6...a41b0f9a`](https://wirefluidscan.com/tx/0x6477ffd649675a040b9e24297aaedbbbbcde3ef5342a2bd594c96fcca41b0f9a) |
| 43 | Sp6 QG | [`0x8dd3c210...a9b56cf8`](https://wirefluidscan.com/tx/0x8dd3c2109b937ccc4fa4c66ca1b0e7f25e37d8a2bf855a0fda67cf31a9b56cf8) |
| 44 | Sp6 HK | [`0xbbe664b7...ced773d4`](https://wirefluidscan.com/tx/0xbbe664b764b654514240ad4c688d6b7e26a164cb0c3c755f882a54a6ced773d4) |
| 45 | Sp6 RW | [`0x9795a183...cfdaf4f4`](https://wirefluidscan.com/tx/0x9795a183fb088b3c64a77e7db161bfab942d99d0584fc14459fa9b70cfdaf4f4) |
| 46 | Sp7 IU | [`0xf1598f84...98dbe74d`](https://wirefluidscan.com/tx/0xf1598f8413b4656624543b9eb732903c7704a184dd0b79adb78aff0998dbe74d) |
| 47 | Sp7 LQ | [`0xf553895f...eefe02af`](https://wirefluidscan.com/tx/0xf553895f418ea405f8fcf00d60f6857419f8d284aa4debcade6635e8eefe02af) |
| 48 | Sp7 MS | [`0x6193aca0...687dccca`](https://wirefluidscan.com/tx/0x6193aca0b88c854eb092dfa33868ef7ff104e916bbb8c12418a987a5687dccca) |
| 49 | Sp7 KK | [`0x35942c75...af930c18`](https://wirefluidscan.com/tx/0x35942c754806bcd64d246c38edc68ccf634893462aa6cc49d7db49e5af930c18) |
| 50 | Sp7 PZ | [`0xc00ce8a3...5beca296`](https://wirefluidscan.com/tx/0xc00ce8a36ac940b954ea026cbd9578b17283cb91a979a5caf865983e5beca296) |
| 51 | Sp7 QG | [`0xc0e2b11e...40a36787`](https://wirefluidscan.com/tx/0xc0e2b11e906509d6c22d2f8975a12342272d4531ecf9f7c0ed1b391240a36787) |
| 52 | Sp7 HK | [`0xd61c4b88...53985bd8`](https://wirefluidscan.com/tx/0xd61c4b88d3af0c6355ae5ed39fc0fd5c11cf018b540421ccd3a4c78553985bd8) |
| 53 | Sp7 RW | [`0x439fda00...cb0231f2`](https://wirefluidscan.com/tx/0x439fda009799bb48a56a66aff7b130890b1daaa6a10160992a4d1109cb0231f2) |
| 54 | Sp8 IU | [`0xde5f264b...1f9a44fc`](https://wirefluidscan.com/tx/0xde5f264b2908a277c7ecd211d59a0f40bf145a1ac428d631b80cb23c1f9a44fc) |
| 55 | Sp8 LQ | [`0xdd52a848...91850a81`](https://wirefluidscan.com/tx/0xdd52a848baa762f0ad81a19dd5dc7901575697452b95d74075ad629f91850a81) |
| 56 | Sp8 MS | [`0xc70bbe11...97d33c21`](https://wirefluidscan.com/tx/0xc70bbe11ff0eca7cba5fde855aa173793e2acf72c8f68afc1111701397d33c21) |
| 57 | Sp8 KK | [`0xffd707e8...c215d139`](https://wirefluidscan.com/tx/0xffd707e860ecdd294bcec3705ccf09afc8006d377fc45bde118dbef4c215d139) |
| 58 | Sp8 PZ | [`0x85ec50b4...5d248c80`](https://wirefluidscan.com/tx/0x85ec50b446f7f64fc67873f47ea4df762cae598b7b427f2955542f545d248c80) |
| 59 | Sp8 QG | [`0x640a391d...03bd8305`](https://wirefluidscan.com/tx/0x640a391dbbb5989e91a179cad05ebf8ba6912acd83b834ff938696e803bd8305) |
| 60 | Sp8 HK | [`0x2aa2eb85...9b62f342`](https://wirefluidscan.com/tx/0x2aa2eb858f5985157d80f55d7b1190d723dbd840bf61162c18541eb49b62f342) |
| 61 | Sp8 RW | [`0xca6b9c51...1311a4dc`](https://wirefluidscan.com/tx/0xca6b9c518f569db9f29cc9990351e273301ba65bbe0a266142a40eba1311a4dc) |
| 62 | Sp9 IU | [`0x1d677af7...5ea0fda2`](https://wirefluidscan.com/tx/0x1d677af70707ed371ddb2662ff52958a9ea037e20693972f08fe87a45ea0fda2) |
| 63 | Sp9 LQ | [`0x7b7dbf22...d5fa4b40`](https://wirefluidscan.com/tx/0x7b7dbf221fda9a22d98f9262a4238ddf2c65f823a9a0954c986c7001d5fa4b40) |
| 64 | Sp9 MS | [`0x16f3bcf5...8a616026`](https://wirefluidscan.com/tx/0x16f3bcf5afa809d4244b74f59daab1f417af6d76d9ee7c01f1f059748a616026) |
| 65 | Sp9 KK | [`0x041a2c51...78794c9d`](https://wirefluidscan.com/tx/0x041a2c51e2a09fbc86e5cb813860842c5c8c5b67f04be22fe83fde2e78794c9d) |
| 66 | Sp9 PZ | [`0xb9c47e37...3694dba6`](https://wirefluidscan.com/tx/0xb9c47e377ce15837a5970a4ba1530c74e9b469304a05f582d4e3ade23694dba6) |
| 67 | Sp9 QG | [`0x794ea25d...43507de9`](https://wirefluidscan.com/tx/0x794ea25d73454fe8a5b3c84fa19d5d6d8c95fd53bc020403332371d343507de9) |
| 68 | Sp9 HK | [`0xf8660243...e650fd9f`](https://wirefluidscan.com/tx/0xf86602434caaac42680af2960d309b22daa523dba87e5c0ae56ea6ebe650fd9f) |
| 69 | Sp9 RW | [`0x4aa776ff...9447b8d6`](https://wirefluidscan.com/tx/0x4aa776ffdc3ff094d5ea03f9688a0e1e77afac6d6821ef0d891bb9f39447b8d6) |
| 70 | Sp10 IU | [`0xf2569c6b...768a5050`](https://wirefluidscan.com/tx/0xf2569c6b60d6862a362dc209ca74b5ca6797a0d6bffa758ef16fb56b768a5050) |
| 71 | Sp10 LQ | [`0x8e00837a...f85d3a41`](https://wirefluidscan.com/tx/0x8e00837a4cfc0b3736e9f47376dfad2ac4704adb033a6c465fa1bcb5f85d3a41) |
| 72 | Sp10 MS | [`0x659e9111...26dbb8d7`](https://wirefluidscan.com/tx/0x659e9111dfea53330984ca588d21aa86694338fd877030f30b148faf26dbb8d7) |
| 73 | Sp10 KK | [`0x2fcc4688...f38bb5d0`](https://wirefluidscan.com/tx/0x2fcc4688dd294a2e1263acd29294376bfe85964a385748816c087017f38bb5d0) |
| 74 | Sp10 PZ | [`0x599c8af8...5127e1f0`](https://wirefluidscan.com/tx/0x599c8af8ac5bbf1de41b6aefcf50c16510aeea61a6468b4ed5a7b9005127e1f0) |
| 75 | Sp10 QG | [`0x13958d24...e50b3042`](https://wirefluidscan.com/tx/0x13958d24713b23a07b076e48651f7073eed34fe275f884e6fd66c016e50b3042) |
| 76 | Sp10 HK | [`0xa36312da...95f36620`](https://wirefluidscan.com/tx/0xa36312dada6b2be67ecba453a0d37e0a2235427b45e924be79e02c9195f36620) |
| 77 | Sp10 RW | [`0x96c69cf0...1895dfa6`](https://wirefluidscan.com/tx/0x96c69cf0649d721bcc71d7b51d55656246f08c726f8bb8b2ff8095fa1895dfa6) |
| 78 | Sp11 IU | [`0x552b72c2...4bd1d6d0`](https://wirefluidscan.com/tx/0x552b72c281d45efdd950207971fef0f06eadd2b43de82088d60a9d194bd1d6d0) |
| 79 | Sp11 LQ | [`0x6137165b...cc9d540d`](https://wirefluidscan.com/tx/0x6137165b921e8e2a639a4122fe8efad2947027ea21fc50c471724d4fcc9d540d) |
| 80 | Sp11 MS | [`0xb98e0433...6fe72771`](https://wirefluidscan.com/tx/0xb98e0433463ed303db12306ab016e5e881452e0a9548cdc0981a237d6fe72771) |
| 81 | Sp11 KK | [`0xa495d217...56393815`](https://wirefluidscan.com/tx/0xa495d21747328c94876b30cd07f9af711c802bb9211638f3c962d81656393815) |
| 82 | Sp11 PZ | [`0x0f191581...ba77c19f`](https://wirefluidscan.com/tx/0x0f1915818f6201cc132719652db78504569566b8f984d918575984ceba77c19f) |
| 83 | Sp11 QG | [`0xe6ca708d...19139e94`](https://wirefluidscan.com/tx/0xe6ca708dedac710da3eb34c1509789d1a76e1d390fdd9bc0d8885f4c19139e94) |
| 84 | Sp11 HK | [`0x10d71b1a...43f260fa`](https://wirefluidscan.com/tx/0x10d71b1ac3405c096667ccf338fb4eba1787b56709cde46961164b2743f260fa) |
| 85 | Sp11 RW | [`0x7a97f228...ab5ed08d`](https://wirefluidscan.com/tx/0x7a97f2282104a3e8afe4e96632da275ccbdac97307ddf7e4c359fcdbab5ed08d) |
| 86 | Sp12 IU | [`0xd686edd0...5723d80a`](https://wirefluidscan.com/tx/0xd686edd0157fa569c05b6437d43b283f56ea39ca7e6a227da209b6ee5723d80a) |
| 87 | Sp12 LQ | [`0x94049190...eb2bc1df`](https://wirefluidscan.com/tx/0x9404919011820bfa6ad5e3dd94901641ecc42f1651e8807ba06e0addeb2bc1df) |
| 88 | Sp12 MS | [`0x77d2bb8b...b8a12a86`](https://wirefluidscan.com/tx/0x77d2bb8bcf44c880f7c9ef0122989c9592e71670b4a7fc7fefd39726b8a12a86) |
| 89 | Sp12 KK | [`0x735af5e8...6742b9d1`](https://wirefluidscan.com/tx/0x735af5e81c86f412932e517f0d820faa7dfad2482bbe781608cb8d466742b9d1) |
| 90 | Sp12 PZ | [`0x9fe09c5b...ca4b1a24`](https://wirefluidscan.com/tx/0x9fe09c5ba582baadbd6974ab6e0e17ff3294ca9667a21e826836f8e8ca4b1a24) |
| 91 | Sp12 QG | [`0xd958c41a...5d7285f0`](https://wirefluidscan.com/tx/0xd958c41a81e30b021ddce20a5f22635162e76f23cc094aec1fa852ad5d7285f0) |
| 92 | Sp12 HK | [`0x6702c82d...2431a3cc`](https://wirefluidscan.com/tx/0x6702c82d3e9fccf21d161b7856ab399575e52ca8b040425aa0a3e3d12431a3cc) |
| 93 | Sp12 RW | [`0x40f9f8ef...28db12f0`](https://wirefluidscan.com/tx/0x40f9f8ef0d302deb75776ba5065557de92fcc7cafc396e7a721aa2d228db12f0) |
| 94 | Sp13 IU | [`0x71dcfc0a...327b9479`](https://wirefluidscan.com/tx/0x71dcfc0a342d672199129c5b12ea53189bbfe74b595076896fbbb55b327b9479) |
| 95 | Sp13 LQ | [`0x81b6e2d5...5ed46ab7`](https://wirefluidscan.com/tx/0x81b6e2d54082539ac3a706c84e624024bde147bbd8ecccc59600ca1e5ed46ab7) |
| 96 | Sp13 MS | [`0xec8c3aa6...872edeed`](https://wirefluidscan.com/tx/0xec8c3aa6f8a580f02f20d6f41ffc9c641a1d6f403b0c5cc91e0f6fbf872edeed) |
| 97 | Sp13 KK | [`0x2286baf5...4e404fb6`](https://wirefluidscan.com/tx/0x2286baf525b01ba4bb2f84408cdccd3ca8c39e8fa868da4ba98b48604e404fb6) |
| 98 | Sp13 PZ | [`0x8980d715...f68ac97d`](https://wirefluidscan.com/tx/0x8980d7155a689899c9cd53a71b89563b80b80ebfa6be42a03fae3db6f68ac97d) |
| 99 | Sp13 QG | [`0x3788ff58...9f7f8ca0`](https://wirefluidscan.com/tx/0x3788ff58e308d602b9e44640caf6118cd16923773b88cedb4a99752b9f7f8ca0) |
| 100 | Sp13 HK | [`0x3bb28a82...9170986d`](https://wirefluidscan.com/tx/0x3bb28a82098a5ef1eb5bb81d027b940b0ba47dec763830241dbaee3d9170986d) |
| 101 | Sp13 RW | [`0x5eb29e94...ea02b224`](https://wirefluidscan.com/tx/0x5eb29e9482582fe7242df49ad52197d350ff25557f929ab2adc25ad3ea02b224) |
| 102 | Sp14 IU | [`0x7c168e65...1ae71c62`](https://wirefluidscan.com/tx/0x7c168e65d53b205e54eba8a8766a6f924af0eea2ead26c88b8544d031ae71c62) |
| 103 | Sp14 LQ | [`0x5ef93f14...1062c0ce`](https://wirefluidscan.com/tx/0x5ef93f14f48e4c5686f1c01263db8d38931654670f3be32b617a4c721062c0ce) |
| 104 | Sp14 MS | [`0xfdbdd7b2...2b0a02ae`](https://wirefluidscan.com/tx/0xfdbdd7b24aba576cd29b0822fd16b80188e86eafd526dc1ef52b80792b0a02ae) |
| 105 | Sp14 KK | [`0x39e9bbbd...0816dcce`](https://wirefluidscan.com/tx/0x39e9bbbd33714ef922cc7f5f75cdfda786a91f8eebb272adfe6c0c9b0816dcce) |
| 106 | Sp14 PZ | [`0x22cc6ab5...af5ce98e`](https://wirefluidscan.com/tx/0x22cc6ab552357abbeca636b411d88e69094bb20de06a883ad54723c9af5ce98e) |
| 107 | Sp14 QG | [`0x652a263d...03b46f55`](https://wirefluidscan.com/tx/0x652a263d90a397e312be083e22d30f60e0c3760f1d0014d41970d70303b46f55) |
| 108 | Sp14 HK | [`0xc2c9cdbc...5cb4cd9e`](https://wirefluidscan.com/tx/0xc2c9cdbcff8141c9e2facfa7bf5423b75d1c39700223973426c912ca5cb4cd9e) |
| 109 | Sp14 RW | [`0x5619e452...dec595a7`](https://wirefluidscan.com/tx/0x5619e452922989f15484da5b4082b70f4902e7bcea40b30905d2439fdec595a7) |
| 110 | Sp15 IU | [`0x8f51598d...b37959e5`](https://wirefluidscan.com/tx/0x8f51598d1bd460fc2d1dc09bae2c440969d3471b327ba3a0e3e0fecab37959e5) |
| 111 | Sp15 LQ | [`0x8a8a27d7...cf40e915`](https://wirefluidscan.com/tx/0x8a8a27d757ac067f2b0bb22507e33b2e480014d2b697f23b3ab833c6cf40e915) |
| 112 | Sp15 MS | [`0x080a46d4...5d5d74b5`](https://wirefluidscan.com/tx/0x080a46d44a933555a5bcc9e93412e7c8ef975e664094a92e677350e35d5d74b5) |
| 113 | Sp15 KK | [`0xc4605185...4b5cca5a`](https://wirefluidscan.com/tx/0xc46051853ccc27f4a68436a16744cc31d8b0b7c191b75bca47cc07794b5cca5a) |
| 114 | Sp15 PZ | [`0x1fc427e4...04b6611b`](https://wirefluidscan.com/tx/0x1fc427e432bc42801f238e3ea4865333207c8041d03e04d488d4fca504b6611b) |
| 115 | Sp15 QG | [`0x41a701dd...13b836ba`](https://wirefluidscan.com/tx/0x41a701dd145085b0065ef898d2d28328831a11a5b2e1bd68052628e513b836ba) |
| 116 | Sp15 HK | [`0xb019acd8...5257e7e2`](https://wirefluidscan.com/tx/0xb019acd83575c808dbf319aad5021a9d7dd2ad67a5b33c462e9792d35257e7e2) |
| 117 | Sp15 RW | [`0x8fb7a3bc...718763f2`](https://wirefluidscan.com/tx/0x8fb7a3bc3274916e6fbe71ac87cbd57e08c6b301ce917bc43955a90f718763f2) |
| 118 | Sp16 IU | [`0xfe828978...46936e54`](https://wirefluidscan.com/tx/0xfe8289781fdac71f70836e456a88a32912530a3d83da3bdcac811b6e46936e54) |
| 119 | Sp16 LQ | [`0xc4154639...9b161d52`](https://wirefluidscan.com/tx/0xc415463903d97ea94d3d8d74e1514713a0f5eda0af397d4abdbc4e769b161d52) |
| 120 | Sp16 MS | [`0x1b93cf2d...73ebe825`](https://wirefluidscan.com/tx/0x1b93cf2dc8ba255e41ca628937594b6e366b74a57406697c796fc24673ebe825) |
| 121 | Sp16 KK | [`0xc0979be0...e2515935`](https://wirefluidscan.com/tx/0xc0979be088869751b718fae4b9008f472f51885054639fa910a4e4b6e2515935) |
| 122 | Sp16 PZ | [`0xc0e73073...dd4d5ea1`](https://wirefluidscan.com/tx/0xc0e730737687faa5c45e178ed27a84cec8ace176a29aad73fbed1933dd4d5ea1) |
| 123 | Sp16 QG | [`0x4450ba60...35a6c299`](https://wirefluidscan.com/tx/0x4450ba60be6d45aa617c20e1454df3eef332cfcb72a437d1580b4fa435a6c299) |
| 124 | Sp16 HK | [`0x5f44bd44...922a826f`](https://wirefluidscan.com/tx/0x5f44bd44b49e49411025a6e7931cf6a252eae94912962a4e4d9983e1922a826f) |
| 125 | Sp16 RW | [`0x5c1fd8fd...9962d9d3`](https://wirefluidscan.com/tx/0x5c1fd8fde1206a663e803229f89dd66654e167f24894c7b60c248e7a9962d9d3) |
| 126 | Sp17 IU | [`0x82390c8a...98e1c676`](https://wirefluidscan.com/tx/0x82390c8a3df25421e6228d2626b4d0b8f41b9b9ede8c416c6c00c36e98e1c676) |
| 127 | Sp17 LQ | [`0x63b70a53...d826d59f`](https://wirefluidscan.com/tx/0x63b70a53483a704680667223ccd302cc841fe627c30f3687f1e2096cd826d59f) |
| 128 | Sp17 MS | [`0xd04af670...6510758a`](https://wirefluidscan.com/tx/0xd04af6707142078d793917b64fea4b238bf49bfffded762fff606a8f6510758a) |
| 129 | Sp17 KK | [`0xef082613...0c0ca461`](https://wirefluidscan.com/tx/0xef08261346b1f299fcb3440ac2f27cad7f6396d227c20168498ffb010c0ca461) |
| 130 | Sp17 PZ | [`0xfe716a9f...56f7f82e`](https://wirefluidscan.com/tx/0xfe716a9f3f71cbb15e500f37dbf917e18ebeab14e697712e5fc2362b56f7f82e) |
| 131 | Sp17 QG | [`0xaae45008...07cc2705`](https://wirefluidscan.com/tx/0xaae450080df6c9743e81cf8cabf870fa77170c010845314d7aebcb7707cc2705) |
| 132 | Sp17 HK | [`0x50f78ea1...f0045852`](https://wirefluidscan.com/tx/0x50f78ea173661f0053913cedb9013a55efe797b5135c4dfd52be7bc2f0045852) |
| 133 | Sp17 RW | [`0xb68c90ca...8839c028`](https://wirefluidscan.com/tx/0xb68c90ca6512257025ccf9d94c53859b84edf1abe6efe5e8893c2bfc8839c028) |
| 134 | Sp18 IU | [`0xeac8cdb6...1999a264`](https://wirefluidscan.com/tx/0xeac8cdb6a35f5ca2de125bd2f466fe2ea856786198d051fe06009e4b1999a264) |
| 135 | Sp18 LQ | [`0x0793d346...aa8de303`](https://wirefluidscan.com/tx/0x0793d34605e5c3d20c3dd0ea0482cf401c4cf94396f35bd00dc4e438aa8de303) |
| 136 | Sp18 MS | [`0x15cbd079...ea145955`](https://wirefluidscan.com/tx/0x15cbd0793d0adb6072bd45c73cdd3288eb4965be95c9a73e74ef1586ea145955) |
| 137 | Sp18 KK | [`0xf35fcc49...035975e9`](https://wirefluidscan.com/tx/0xf35fcc49b0fd853e50e2074eb7fc690e2c8c418ea8ed7e70a8d6d425035975e9) |
| 138 | Sp18 PZ | [`0x79ca89e5...3ffc1a98`](https://wirefluidscan.com/tx/0x79ca89e5f3266a217163fe0dd61d18fe84d74da5022b909277a5a8453ffc1a98) |
| 139 | Sp18 QG | [`0xddd66c4b...034e8bbb`](https://wirefluidscan.com/tx/0xddd66c4b67b160c56c9f0081582e11b97751094e0be8c91ca6c88c4b034e8bbb) |
| 140 | Sp18 HK | [`0xa2cc1707...18d91d5c`](https://wirefluidscan.com/tx/0xa2cc1707aaa9c03c23486ff5abe5b07fb528af781169078b55ba909518d91d5c) |
| 141 | Sp18 RW | [`0x68866733...838911bd`](https://wirefluidscan.com/tx/0x68866733db785f824c1aae0b209c526fc44fda8656cf723fbb27632c838911bd) |
| 142 | Sp19 IU | [`0x83da4029...e7e91e00`](https://wirefluidscan.com/tx/0x83da402999a84dec8939006184a96d2a1d2c6ceac7e97b25d974db21e7e91e00) |
| 143 | Sp19 LQ | [`0x563ae7c1...7067638d`](https://wirefluidscan.com/tx/0x563ae7c10c987b87aaacd21994769365c4d8fe810ea38e3a864ce4e97067638d) |
| 144 | Sp19 MS | [`0x827ac309...72c061d8`](https://wirefluidscan.com/tx/0x827ac309b4109e01e830577f206d4838be319f2a3620a39da06b8a2072c061d8) |
| 145 | Sp19 KK | [`0x980bd5fd...c4fbfd95`](https://wirefluidscan.com/tx/0x980bd5fdb55d9bf9fcd776e3c7ac80661d492a6ce1608aa14375959fc4fbfd95) |
| 146 | Sp19 PZ | [`0xe64a0d70...5888de83`](https://wirefluidscan.com/tx/0xe64a0d70d64f7ffd490619fc13fd48754d01937aecbcab8293c1c5345888de83) |
| 147 | Sp19 QG | [`0x0b791013...0cf9de9a`](https://wirefluidscan.com/tx/0x0b791013d7faa0ebf574c7b28c26e4f0e9d2b5c199ea5ed46ff848160cf9de9a) |
| 148 | Sp19 HK | [`0x4478decf...5460fbc5`](https://wirefluidscan.com/tx/0x4478decfeae0611f5f2f90bbfc3ab9ae89d2f24514268461e4e484055460fbc5) |
| 149 | Sp19 RW | [`0x6058adcb...483fd720`](https://wirefluidscan.com/tx/0x6058adcbfaef27d70e7d41877a278a4efdd4d88dedc5b20cf4979ef9483fd720) |
| 150 | Sp20 IU | [`0x9c5e5276...f2eb308e`](https://wirefluidscan.com/tx/0x9c5e5276db1ed9cc105b44d0ee78aab0ecc96ebb1d47de4ab34bb363f2eb308e) |
| 151 | Sp20 LQ | [`0xfcdcadfe...ded4f58d`](https://wirefluidscan.com/tx/0xfcdcadfe7c5381e0a301d7c6069f389502444f9b59bc482bf38a0ef7ded4f58d) |
| 152 | Sp20 MS | [`0x595cfb8b...bf1cc97f`](https://wirefluidscan.com/tx/0x595cfb8b798a49be6818da98983587632023f71cd028a9dccd02a908bf1cc97f) |
| 153 | Sp20 KK | [`0xf3a78c6e...c34fae1b`](https://wirefluidscan.com/tx/0xf3a78c6e308b987943dd62c68f57321ddbfcf29ee48eb1e0d12b3554c34fae1b) |
| 154 | Sp20 PZ | [`0x852c8f4d...18b2a49e`](https://wirefluidscan.com/tx/0x852c8f4d7c3a3aa49ad0e21356907b4be9c02ab467fc57a202beef5818b2a49e) |
| 155 | Sp20 QG | [`0x6ac4e7de...3cdfd754`](https://wirefluidscan.com/tx/0x6ac4e7de69e0dedeb3dada6dad1cde8ccf88fc90541821510004ed483cdfd754) |
| 156 | Sp20 HK | [`0x9ca4be2b...74cdb1f9`](https://wirefluidscan.com/tx/0x9ca4be2bcaee0d70ad03c69e3291e33e23b945ee1f93e2403522dc3974cdb1f9) |
| 157 | Sp20 RW | [`0xd3a5ff53...05f9b4e7`](https://wirefluidscan.com/tx/0xd3a5ff5394eb969ca22930143b4db60798994f8c03e577a628148b7a05f9b4e7) |

</details>

<details>
<summary>S13 — Token transfer tests (8 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Xfer IU | [`0x0d3faccc...49864ab4`](https://wirefluidscan.com/tx/0x0d3faccc6de566c8b1b56a1375a6c44b4db961b43a31722ef0151acd49864ab4) |
| 2 | Xfer LQ | [`0xb4d85d91...e4915a72`](https://wirefluidscan.com/tx/0xb4d85d913b2c3d2ff02a1e805eef1ff9f2b2ae7fb527365dff415f7ee4915a72) |
| 3 | Xfer MS | [`0xe8ffdb31...30f8f93d`](https://wirefluidscan.com/tx/0xe8ffdb31d4a08e619a520fd449fdc1fc897000c19a779df9eb751ace30f8f93d) |
| 4 | Xfer KK | [`0x9938d811...ef8b6d8e`](https://wirefluidscan.com/tx/0x9938d811b527dccb9f9c0c2d78712fe41f6797aa78632c61b4573f23ef8b6d8e) |
| 5 | Xfer PZ | [`0xcd46bb85...9c74bab1`](https://wirefluidscan.com/tx/0xcd46bb854b10c4423f971e5c4785392ae7d0e3c031c64c4d002564129c74bab1) |
| 6 | Xfer QG | [`0x7ed77740...48887539`](https://wirefluidscan.com/tx/0x7ed77740288f1ed2a0b64fa06af775f3f094027bb96328a25973eef148887539) |
| 7 | Xfer HK | [`0x98362fb3...f8031103`](https://wirefluidscan.com/tx/0x98362fb3b69a2ca0d0ce8fa9c005157c5e4d4ce4aa53463d4e69edc1f8031103) |
| 8 | Xfer RW | [`0x70195c4d...010d6cab`](https://wirefluidscan.com/tx/0x70195c4d40a9808b89d458e15b2a1351c1e55949d3dc99a200db01c0010d6cab) |

</details>

<details>
<summary>S14 — Final sell all (16 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Appr IU | [`0xc83d27f2...ceebfa8f`](https://wirefluidscan.com/tx/0xc83d27f296218a74cca46a882baaa4e82ba448410583a8974a3f5cc8ceebfa8f) |
| 2 | Sell IU | [`0xa1a9b82a...cdac0fb7`](https://wirefluidscan.com/tx/0xa1a9b82a2853c4836fee506781229418f554a8c7b5b84cc27a877cc9cdac0fb7) |
| 3 | Appr LQ | [`0x5453bfc4...8859b387`](https://wirefluidscan.com/tx/0x5453bfc4a024173e0175e6cf74a8e1c2a63b3d35099bce0f72dc0d668859b387) |
| 4 | Sell LQ | [`0xc5361bbc...457a8cda`](https://wirefluidscan.com/tx/0xc5361bbc83a82df62b7655072873021ac78bac77b196684b709e9079457a8cda) |
| 5 | Appr MS | [`0xefd1f0cd...5f754538`](https://wirefluidscan.com/tx/0xefd1f0cdc7daaa484f1e9e23b0a45bceedcecd476f2d6512a6ce149d5f754538) |
| 6 | Sell MS | [`0x3f75656a...4fc363b7`](https://wirefluidscan.com/tx/0x3f75656a717687195368ab91bf1db3a0b2126b4eeff7933de1d29aec4fc363b7) |
| 7 | Appr KK | [`0x4f3b461a...e5f87e51`](https://wirefluidscan.com/tx/0x4f3b461a74a940a6d208b47cc9e126966432485fb2781e217e99de0be5f87e51) |
| 8 | Sell KK | [`0xeee7d07e...c31cd652`](https://wirefluidscan.com/tx/0xeee7d07e24045bfc663dade445b9623d3b21e54af11c10450cc7f82fc31cd652) |
| 9 | Appr PZ | [`0x69def41d...2aa5f019`](https://wirefluidscan.com/tx/0x69def41da23e08ea8e8077b5293a56b408145c0bec2f8d6f3c96eff12aa5f019) |
| 10 | Sell PZ | [`0x230bfbc9...ff1ffc43`](https://wirefluidscan.com/tx/0x230bfbc909ff5aa825960a2f1d8a3d306ad004dc1dbc0963a6651c95ff1ffc43) |
| 11 | Appr QG | [`0x977117ef...2e249ebd`](https://wirefluidscan.com/tx/0x977117ef0bae6ddc9b9cfbed1c7d21ef6e824c35864e6b436d4a55632e249ebd) |
| 12 | Sell QG | [`0x2885139f...36fe9652`](https://wirefluidscan.com/tx/0x2885139f0bd71bcd73715a420da15fc3ba2ccb9d3f48f28f13137c6b36fe9652) |
| 13 | Appr HK | [`0xf932d72f...346fc7c4`](https://wirefluidscan.com/tx/0xf932d72f432fbdc2bbc52bd6e5e524d1139caadf52e6a3b4b0d07a9e346fc7c4) |
| 14 | Sell HK | [`0xc8060c6a...7b7476be`](https://wirefluidscan.com/tx/0xc8060c6ac014842e733a7053145bceaed2c60fe1adcba7d5f4fa80e27b7476be) |
| 15 | Appr RW | [`0xaea8b04c...038e7bd1`](https://wirefluidscan.com/tx/0xaea8b04c481f52a26613220de61fc470d81ef8636f3c32173bed0eaf038e7bd1) |
| 16 | Sell RW | [`0x5292d3f5...236d36ce`](https://wirefluidscan.com/tx/0x5292d3f5df97f2f92edb81b745127cc63199cfb4f62d3694d0501fb8236d36ce) |

</details>

<details>
<summary>S2 — Buy all 8 tokens x 10 rounds (80 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | R1 Buy IU | [`0xeebacd14...7792a329`](https://wirefluidscan.com/tx/0xeebacd148bc8032a233aa3b010c7f43a66bf85d976d68bb9bb8ff84e7792a329) |
| 2 | R1 Buy LQ | [`0x5006f81b...89efb9b1`](https://wirefluidscan.com/tx/0x5006f81b44e6d2e48f53261b55afce335ca868af3efbc3f3f996945189efb9b1) |
| 3 | R1 Buy MS | [`0x84bcc884...45489097`](https://wirefluidscan.com/tx/0x84bcc884ec31337364b4a9e759ff3ecfbb8fe4c5130a70fd8e0ce3ad45489097) |
| 4 | R1 Buy KK | [`0x08b0aff7...54bd9abb`](https://wirefluidscan.com/tx/0x08b0aff725ff00b3dbdd912442b59a6a8d310a0ddc19a9b5046c5e0854bd9abb) |
| 5 | R1 Buy PZ | [`0x9c304a98...e091c4ea`](https://wirefluidscan.com/tx/0x9c304a98ea3103098aca0564dd15dbdc6979fc4c62cf1de1f268639fe091c4ea) |
| 6 | R1 Buy QG | [`0x8eb1ef63...c8c32f0e`](https://wirefluidscan.com/tx/0x8eb1ef635e60b60168507689baca9ddc1483b3d652a07b9d1ee2ecd5c8c32f0e) |
| 7 | R1 Buy HK | [`0x4d07e048...c543fb6a`](https://wirefluidscan.com/tx/0x4d07e04878a9c6f68f08e2607e9083c92e140f225e1df2353eaa23b5c543fb6a) |
| 8 | R1 Buy RW | [`0x58a7c8b7...97a78a8c`](https://wirefluidscan.com/tx/0x58a7c8b7b3c7bb53e7dd351355398972177191cae795786b42975ef197a78a8c) |
| 9 | R2 Buy IU | [`0xd3d3039f...b1f59acc`](https://wirefluidscan.com/tx/0xd3d3039f4136a2bedacb510e66c378523fadb6babc2a811ed17c10b9b1f59acc) |
| 10 | R2 Buy LQ | [`0x0fb08915...db9f62ab`](https://wirefluidscan.com/tx/0x0fb089159b7998d9296c195b904c6bad9f631b1f268f5256a24d9cfbdb9f62ab) |
| 11 | R2 Buy MS | [`0x67afe9df...b0e349a5`](https://wirefluidscan.com/tx/0x67afe9dfe5793b95d4f0f12cd890108863f5355e5098f92901c461fbb0e349a5) |
| 12 | R2 Buy KK | [`0x3e0faf9b...15abd856`](https://wirefluidscan.com/tx/0x3e0faf9b51d9bf80ebd1a7d35bf074085b8f8b181d99bd14df6e9e7215abd856) |
| 13 | R2 Buy PZ | [`0x2a0c1517...ad5a6de3`](https://wirefluidscan.com/tx/0x2a0c151715071a994c72213c4d26fadf60fb4d6fe21939f8b6d93c49ad5a6de3) |
| 14 | R2 Buy QG | [`0x0cbaefbd...71025d26`](https://wirefluidscan.com/tx/0x0cbaefbd3d33cf6b4e951a37cbf748cdab72c45162277fb85727c1c471025d26) |
| 15 | R2 Buy HK | [`0xcdd45afb...bfbe7933`](https://wirefluidscan.com/tx/0xcdd45afb34068eb1f5430c1fd593469705adc46b1c9b5b8cbfa3bad2bfbe7933) |
| 16 | R2 Buy RW | [`0x297d38d3...cb4ac3f6`](https://wirefluidscan.com/tx/0x297d38d37d1ef8664b0421a7fc7b444fbfb051de506b2a42108fd448cb4ac3f6) |
| 17 | R3 Buy IU | [`0x7915e857...6571212c`](https://wirefluidscan.com/tx/0x7915e8579f5be23880fc332e2008b0a232623e0e9d68c1fdbb0f38056571212c) |
| 18 | R3 Buy LQ | [`0x28ac0e25...bca5440e`](https://wirefluidscan.com/tx/0x28ac0e251c1223df8d361e9e32c1ecf3bd614d3e338913c537aafe81bca5440e) |
| 19 | R3 Buy MS | [`0xe4226863...e73417ed`](https://wirefluidscan.com/tx/0xe4226863302f5b8379d62be7766781b58e4cf76a27bbac0764078b85e73417ed) |
| 20 | R3 Buy KK | [`0x58b37626...d9ecdb49`](https://wirefluidscan.com/tx/0x58b37626989a515833533009535abb5f46b34086414cfb5ea1e94e49d9ecdb49) |
| 21 | R3 Buy PZ | [`0x306e91e1...b13bf0d6`](https://wirefluidscan.com/tx/0x306e91e17d5c5d67e98748869695df0c8f227d077e2f9fbc10401c13b13bf0d6) |
| 22 | R3 Buy QG | [`0x9fc2cd71...5c415d42`](https://wirefluidscan.com/tx/0x9fc2cd715fb820db3c3e8555e0e9d0e0029878e2dbbfaae1b703c4d65c415d42) |
| 23 | R3 Buy HK | [`0xbf4c8dc3...34da947d`](https://wirefluidscan.com/tx/0xbf4c8dc383bd3d20444db562acc3bf0bb7745a00b3cc8a3c3f92b5b234da947d) |
| 24 | R3 Buy RW | [`0x30377886...89861759`](https://wirefluidscan.com/tx/0x303778869f4b706950fedfd1ac9966e706affaf0ac85ae20256f024789861759) |
| 25 | R4 Buy IU | [`0x96580989...71522cba`](https://wirefluidscan.com/tx/0x96580989929ef66562a8e9338155cf42e73a217b637ecd176dc05b3071522cba) |
| 26 | R4 Buy LQ | [`0x21d40855...7b2b2269`](https://wirefluidscan.com/tx/0x21d408558bdb61e6498134bfec6fb734a4044d31afa957abf6756a087b2b2269) |
| 27 | R4 Buy MS | [`0x4793eab5...4549f63f`](https://wirefluidscan.com/tx/0x4793eab53b957e0da28d5facae3b63fcd3eb501790ed63002ee9101a4549f63f) |
| 28 | R4 Buy KK | [`0x56a9b59e...467730fe`](https://wirefluidscan.com/tx/0x56a9b59e8f68f4e4c748d60c8077bcbbef5d539bd1b9fcd568ec6ca1467730fe) |
| 29 | R4 Buy PZ | [`0x1e749a73...df1b084c`](https://wirefluidscan.com/tx/0x1e749a73a71b7c898233db550710748f3a1bbf998437c617cff5434edf1b084c) |
| 30 | R4 Buy QG | [`0xf006dc7a...ad267c16`](https://wirefluidscan.com/tx/0xf006dc7a0139b0520d77a7aec6540a2bba1921b3ed779e8fb171bc27ad267c16) |
| 31 | R4 Buy HK | [`0x54265dda...b49e8d1c`](https://wirefluidscan.com/tx/0x54265ddafaebdef84c1fbeafe968adeba0d2da1c5fe68742cb6289ddb49e8d1c) |
| 32 | R4 Buy RW | [`0xb8f4e6fd...1feb937e`](https://wirefluidscan.com/tx/0xb8f4e6fd61ed57c0a018a9062860424a341543f07486be2cc3dd43701feb937e) |
| 33 | R5 Buy IU | [`0x0ca6d0ad...0d3ea354`](https://wirefluidscan.com/tx/0x0ca6d0ad2681d83bed9e2afb0bd269bda55d932886aca03aab33a9350d3ea354) |
| 34 | R5 Buy LQ | [`0x6f9628bc...454435fb`](https://wirefluidscan.com/tx/0x6f9628bc0543a45d07f2c353900f15c28d7202b8a5d5700985a0bc42454435fb) |
| 35 | R5 Buy MS | [`0x0599257c...d86c5a5c`](https://wirefluidscan.com/tx/0x0599257cd4e32ef32f391a4265cabd1db7900fb8b8b20ba6d14f1fb5d86c5a5c) |
| 36 | R5 Buy KK | [`0xaaa140a5...e2e60dc4`](https://wirefluidscan.com/tx/0xaaa140a58abc885b5eefd8c732bbec6ef494864cc207c44b478b06d8e2e60dc4) |
| 37 | R5 Buy PZ | [`0x299fdf39...59ee5749`](https://wirefluidscan.com/tx/0x299fdf39fb6831936752e8c975f7d5c5e6ca3bee239fe8a846d40cc859ee5749) |
| 38 | R5 Buy QG | [`0x2b02b4d1...14d16c2b`](https://wirefluidscan.com/tx/0x2b02b4d1941c72cea9741b4acaed2a4b0bce7bf767cd59422198ad7114d16c2b) |
| 39 | R5 Buy HK | [`0xe18b6817...9998dea6`](https://wirefluidscan.com/tx/0xe18b68176d298e1d79e8e39cbec2f5df74f03b48cb927c3a37acb2419998dea6) |
| 40 | R5 Buy RW | [`0xd527b860...c623a481`](https://wirefluidscan.com/tx/0xd527b860daa0b8a431ce87e39bdf1b420c7dd0a0b0eed4ba1072e28fc623a481) |
| 41 | R6 Buy IU | [`0xee384a52...14bfbe0c`](https://wirefluidscan.com/tx/0xee384a52967b488157e9c5eae14f636137eb6f6f4fbdb36501e8c16314bfbe0c) |
| 42 | R6 Buy LQ | [`0x6a021b86...39fc0ccc`](https://wirefluidscan.com/tx/0x6a021b86abe2540bd45a95516e13c69369456b9cc78af28d74ead10a39fc0ccc) |
| 43 | R6 Buy MS | [`0x44340628...78068360`](https://wirefluidscan.com/tx/0x443406283480ce71248345ef87082cbecaab5558fb3aa65a9faaf72578068360) |
| 44 | R6 Buy KK | [`0x1034191f...b35e1649`](https://wirefluidscan.com/tx/0x1034191f213e85b47f47e1680a67d03b7ad43e0bdd7bf54c6dabb87cb35e1649) |
| 45 | R6 Buy PZ | [`0x4cf52042...21aa1665`](https://wirefluidscan.com/tx/0x4cf520427ce1b05adc07ce8007db265d99bfee23f20753f4d5a4d03221aa1665) |
| 46 | R6 Buy QG | [`0x8b5555f0...2be5cd10`](https://wirefluidscan.com/tx/0x8b5555f04e0159142e750a5d0e52f201bd2dd35a74e3bebd54f94b7f2be5cd10) |
| 47 | R6 Buy HK | [`0xb673cb50...f3a49291`](https://wirefluidscan.com/tx/0xb673cb505129704c8a9a9038f104db9ea3232c0447da13a082a1aa47f3a49291) |
| 48 | R6 Buy RW | [`0x380935f6...d7808dcc`](https://wirefluidscan.com/tx/0x380935f6e51eddc5b697208b469814b687e8db49495edd6dc6a602f6d7808dcc) |
| 49 | R7 Buy IU | [`0x6b1bf032...badb6e85`](https://wirefluidscan.com/tx/0x6b1bf032f99a6a6f2a520a9f41a8af5a3f4627f273ac93ac3ffe45d9badb6e85) |
| 50 | R7 Buy LQ | [`0x154f9576...0236ba8e`](https://wirefluidscan.com/tx/0x154f9576b39eacc7e95b61d6a83ccd2f905af8785aa0f329e81762e10236ba8e) |
| 51 | R7 Buy MS | [`0x38802e6c...c7472e5e`](https://wirefluidscan.com/tx/0x38802e6c708302f839411117c6d21669b03e7a4a4405f502ed362680c7472e5e) |
| 52 | R7 Buy KK | [`0xf5a66d90...bda6eb5c`](https://wirefluidscan.com/tx/0xf5a66d900860e406e931f7ecf0c220bfb4f8147c96b6062282424b06bda6eb5c) |
| 53 | R7 Buy PZ | [`0x95c84466...130fc08e`](https://wirefluidscan.com/tx/0x95c844664f5dd1ef700cf8dc31418b102b698911a0cd323d1b48e093130fc08e) |
| 54 | R7 Buy QG | [`0xab4f734a...791811eb`](https://wirefluidscan.com/tx/0xab4f734ac9c8c1f1dedf603ba8e2adb996754c9ca10a5fb20c74c16d791811eb) |
| 55 | R7 Buy HK | [`0xa5dc849e...77ffca11`](https://wirefluidscan.com/tx/0xa5dc849e558f26360ccca901ed5243714f8fbd5065e44ad053387d6777ffca11) |
| 56 | R7 Buy RW | [`0x88dd2296...278bab64`](https://wirefluidscan.com/tx/0x88dd229694cb6a64bf43389b8a14749f48fef12f19dc524bdf54329f278bab64) |
| 57 | R8 Buy IU | [`0x838b8f2d...e66887a4`](https://wirefluidscan.com/tx/0x838b8f2d052cd917f03c82c7b560c3d0cfa616495f2c3d74fcc70769e66887a4) |
| 58 | R8 Buy LQ | [`0x146801dc...5ca6d5d1`](https://wirefluidscan.com/tx/0x146801dc6380f4fa19a046ad263fdd5ffd11a3d9161c8c6ca6e876c65ca6d5d1) |
| 59 | R8 Buy MS | [`0xc91b5917...d0c0b34b`](https://wirefluidscan.com/tx/0xc91b5917ddbba0d6ce89984ffeb9d7e3e2d81e834aca728009a20a58d0c0b34b) |
| 60 | R8 Buy KK | [`0xbfdb70a3...c85b2079`](https://wirefluidscan.com/tx/0xbfdb70a3c8936e0086704df2a0d54384b8a7634bcaafc62997ae2437c85b2079) |
| 61 | R8 Buy PZ | [`0x00499e07...21579cf2`](https://wirefluidscan.com/tx/0x00499e07a0267a20cc5bf3f8176bd3bc5540b72e69c78ab6c95bc5b921579cf2) |
| 62 | R8 Buy QG | [`0x8bd58590...87ea878e`](https://wirefluidscan.com/tx/0x8bd58590a18b8b5b4d37751872105d153a4613ed91e7da71aea928af87ea878e) |
| 63 | R8 Buy HK | [`0xc5e1f777...707d57eb`](https://wirefluidscan.com/tx/0xc5e1f7770fddf68420270f7c7ae3e6b49b2e91870c648f899db67af8707d57eb) |
| 64 | R8 Buy RW | [`0xcf46ff29...623097e1`](https://wirefluidscan.com/tx/0xcf46ff294727ed07f6d33852ab1945b8ed2467e8d648af91303d86e7623097e1) |
| 65 | R9 Buy IU | [`0xb591b17c...3b592acb`](https://wirefluidscan.com/tx/0xb591b17c1cc13a7ab2b00c5329e0dc336ac26d4558ad1ff2933bf2a53b592acb) |
| 66 | R9 Buy LQ | [`0xeb0a7613...2143b30a`](https://wirefluidscan.com/tx/0xeb0a76136843949b9835fe4be994f600dedf7b54d1d3fee447a851802143b30a) |
| 67 | R9 Buy MS | [`0x4d6c049e...9411af37`](https://wirefluidscan.com/tx/0x4d6c049e31bdcafcd37ac2d4e596e3ccfee6b4ccf48afd4f708c22d49411af37) |
| 68 | R9 Buy KK | [`0xf3964a5d...d11a53ea`](https://wirefluidscan.com/tx/0xf3964a5dda5f4b93401bacae1d37796e6bac38c5010a5ef31dacabe9d11a53ea) |
| 69 | R9 Buy PZ | [`0xab9c1b3f...3cc4283e`](https://wirefluidscan.com/tx/0xab9c1b3f3749efcc0710290429c23e9e5575ac3c397cc8025e6bb10a3cc4283e) |
| 70 | R9 Buy QG | [`0xd3af4395...c8f6fee9`](https://wirefluidscan.com/tx/0xd3af43950fe377b678f827bf9d1cd73f1820210430bd4fbb326e140ec8f6fee9) |
| 71 | R9 Buy HK | [`0xea77c0f8...50623da1`](https://wirefluidscan.com/tx/0xea77c0f8e03c9a57024742351bd12a567fad30bf081fee95a91deca050623da1) |
| 72 | R9 Buy RW | [`0xe774c07c...24295a2b`](https://wirefluidscan.com/tx/0xe774c07cac0109f5ef9cb216526cfaa10538900c7cd7948d5c61189c24295a2b) |
| 73 | R10 Buy IU | [`0x72b550f3...1da84272`](https://wirefluidscan.com/tx/0x72b550f3e564ebc8e58ac39f216ea173c10dd0b4c1da9e2f0bcb50a81da84272) |
| 74 | R10 Buy LQ | [`0x57180b5a...11718422`](https://wirefluidscan.com/tx/0x57180b5a732106df0b0ff361e0a965ea0a222f14b10ccdfcadfdd1b811718422) |
| 75 | R10 Buy MS | [`0x7c7e5790...aff9837d`](https://wirefluidscan.com/tx/0x7c7e57907f62048cf5d086b47938063a685250c62854fe8e42f0818baff9837d) |
| 76 | R10 Buy KK | [`0xc27a871a...d7387264`](https://wirefluidscan.com/tx/0xc27a871a260ab7f9d3bbd42d9eac44d8a955ee072f7617571cf540c0d7387264) |
| 77 | R10 Buy PZ | [`0x8600f1f3...22c68672`](https://wirefluidscan.com/tx/0x8600f1f3864e19d9812629c76f5eecf380d74e4bd56ca38f9603574f22c68672) |
| 78 | R10 Buy QG | [`0x5e5d2886...366a4a93`](https://wirefluidscan.com/tx/0x5e5d2886b426f08527e89bb284ea8059ccc1843d13567f30b96aef43366a4a93) |
| 79 | R10 Buy HK | [`0x59546f09...15444798`](https://wirefluidscan.com/tx/0x59546f09c323ec2b5c6ae84b1823be1c3701c0f17404c69078047b5e15444798) |
| 80 | R10 Buy RW | [`0x80821b4d...84e70e9c`](https://wirefluidscan.com/tx/0x80821b4d265ca40f2620bed4b39ff6856ff85726aa5e0893b3159fde84e70e9c) |

</details>

<details>
<summary>S4 — Sell half all tokens (16 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | Approve IU | [`0x4a82e614...571e9061`](https://wirefluidscan.com/tx/0x4a82e614a999e8038d14915b975f86c62d66285ca7db95a6c890cc65571e9061) |
| 2 | Sell IU | [`0xfb3391d4...18a28408`](https://wirefluidscan.com/tx/0xfb3391d4a2d81ea1d60dc427fca1d96ae5613a7b47e9bcecfed1668c18a28408) |
| 3 | Approve LQ | [`0x9810515d...e72cecde`](https://wirefluidscan.com/tx/0x9810515d50ef10d787a2bdd47d3097f8899740dc429b17c435816432e72cecde) |
| 4 | Sell LQ | [`0xa21df06d...5f35f6e2`](https://wirefluidscan.com/tx/0xa21df06dc3a24fb025601437483cc6033f985e0a7a17fe76e3b08e685f35f6e2) |
| 5 | Approve MS | [`0x120a6d86...1e98bf0f`](https://wirefluidscan.com/tx/0x120a6d864126d0aaabc1345e057aab154a5bf5f17a0723c04ade09eb1e98bf0f) |
| 6 | Sell MS | [`0x2e830021...d1d42546`](https://wirefluidscan.com/tx/0x2e830021f21c7cedb27c913fc92752e881217b7fd05b5e9d33949501d1d42546) |
| 7 | Approve KK | [`0x1ff5666b...ca22aba6`](https://wirefluidscan.com/tx/0x1ff5666b90869b527124694cc360aff1c18d61d5e13209b9bfdd7088ca22aba6) |
| 8 | Sell KK | [`0x38b44ef2...f34cc196`](https://wirefluidscan.com/tx/0x38b44ef2b1d8d52e203bafb30565bb0a3acaf714fb4baf2414df1809f34cc196) |
| 9 | Approve PZ | [`0xa2143eec...c8d87b5f`](https://wirefluidscan.com/tx/0xa2143eeceb01f2dcf89b2e34439b5d8c9bfaa5e020bf8cae60d17e63c8d87b5f) |
| 10 | Sell PZ | [`0x10cc3f42...dac4fc24`](https://wirefluidscan.com/tx/0x10cc3f42ca4553175fde77f8bfabe3347ee633f00aef96d6b607da6adac4fc24) |
| 11 | Approve QG | [`0xe29172db...492f4d37`](https://wirefluidscan.com/tx/0xe29172dbe06c03a229ac03e9191fa659020441a2efb3bbccc6dac0be492f4d37) |
| 12 | Sell QG | [`0xe1a6f8bb...7901f3f6`](https://wirefluidscan.com/tx/0xe1a6f8bba60e0e91f8d366f3721216c5d57586a2e122dd0526e9c4507901f3f6) |
| 13 | Approve HK | [`0x5937ee01...1df55dbb`](https://wirefluidscan.com/tx/0x5937ee0136e57c79e5ed2ad3fc45b0affc0fb828fb39624f7307b2621df55dbb) |
| 14 | Sell HK | [`0xfbf72745...7d5083f0`](https://wirefluidscan.com/tx/0xfbf7274570bb96a1c3b68cc7888e631a551421643b4e308f6ce4d8417d5083f0) |
| 15 | Approve RW | [`0x8a94791c...71b79485`](https://wirefluidscan.com/tx/0x8a94791c096f2d6e5d5500477e840f1d91ab3e463db6b9abfaad576071b79485) |
| 16 | Sell RW | [`0x6ef24b52...0ef0602d`](https://wirefluidscan.com/tx/0x6ef24b524c151f5c3b5f8eaf3c894d6c13f06f0e3594e5b64c3542400ef0602d) |

</details>

<details>
<summary>S5 — Rapid-fire IU buys (33 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | IU #18 | [`0x19e20c91...c4ea9f05`](https://wirefluidscan.com/tx/0x19e20c91d6e83fd46f4abcb21785820df2453f52ad9365456cdd834ec4ea9f05) |
| 2 | IU #19 | [`0x11e77da5...415b9948`](https://wirefluidscan.com/tx/0x11e77da5267bcb2787cd3408e869a0c9fb0f50318e971f0cb89436a4415b9948) |
| 3 | IU #20 | [`0x9e18822d...ab364c21`](https://wirefluidscan.com/tx/0x9e18822d26ffea89839263e747171e9c538df884cdf873cb9def4954ab364c21) |
| 4 | IU #21 | [`0xf8454967...f0509bab`](https://wirefluidscan.com/tx/0xf8454967d3e3976a28ab290ef997b5c7cf372910874af3ea341ee28bf0509bab) |
| 5 | IU #22 | [`0x6d207ca8...805988e1`](https://wirefluidscan.com/tx/0x6d207ca87122ad7574072fee2d23d5d1de33129866bb47372067389b805988e1) |
| 6 | IU #23 | [`0xced39960...62df62c2`](https://wirefluidscan.com/tx/0xced399607cef22816b0c5a30a76eb4393441095e05a33f205f8587ab62df62c2) |
| 7 | IU #24 | [`0x3fa96ca2...12cdcb52`](https://wirefluidscan.com/tx/0x3fa96ca203f0f97e238082fc37a2902894bb87508ad8a10cf6a1152c12cdcb52) |
| 8 | IU #25 | [`0x8b22beda...0e8c9e3d`](https://wirefluidscan.com/tx/0x8b22beda097831766c636cabccce798b3dfc56336ecc0a2ec794a71e0e8c9e3d) |
| 9 | IU #26 | [`0x4d9deb16...5a888d1d`](https://wirefluidscan.com/tx/0x4d9deb168003fe8bb5ddbe87dc74a94d72d86bbd9bf3d5d8fe84add75a888d1d) |
| 10 | IU #27 | [`0xaa20b2dd...ffec5f00`](https://wirefluidscan.com/tx/0xaa20b2dd93c05e9e74dc99297ac0b2be69dfd148478d14dc5b4393ddffec5f00) |
| 11 | IU #28 | [`0x7d6e108b...a7247347`](https://wirefluidscan.com/tx/0x7d6e108bc85f1d2dd4fa30773f6afb4681f406d137c1aee74e4e57b7a7247347) |
| 12 | IU #29 | [`0xaaa75674...fc3b8ef3`](https://wirefluidscan.com/tx/0xaaa756743156b7bc99d1b86b9179ba091bb2ee2938b91eceab614cd7fc3b8ef3) |
| 13 | IU #30 | [`0xa84604cc...81ba9704`](https://wirefluidscan.com/tx/0xa84604cce8d90e59fd9cc9e1c5988ae28e4c3bf14bcf961e6f23d54d81ba9704) |
| 14 | IU #31 | [`0xa4266462...e7f55c27`](https://wirefluidscan.com/tx/0xa42664622aa96b8f22dcfd06e63850fc38d26696cf87b6b69d6fb8aee7f55c27) |
| 15 | IU #32 | [`0x8a574d30...89694f1b`](https://wirefluidscan.com/tx/0x8a574d3028af614d49549bc8a90479a32f4dc75c03a72d0c7de52b0389694f1b) |
| 16 | IU #33 | [`0xcd907540...eae20689`](https://wirefluidscan.com/tx/0xcd9075406f70dac1338b58115193e9d247632019844f1e404c60e892eae20689) |
| 17 | IU #34 | [`0xa2042c74...8cb15bd0`](https://wirefluidscan.com/tx/0xa2042c74c29ebae768188178ecc80c54f970f84be4e9bc16f71d679d8cb15bd0) |
| 18 | IU #35 | [`0xc4816014...9a1aa39a`](https://wirefluidscan.com/tx/0xc4816014f274f3db525647567cb0cdff7850c4c0eb6d2e14c8b9fd7b9a1aa39a) |
| 19 | IU #36 | [`0x6aed5a70...79b8eea7`](https://wirefluidscan.com/tx/0x6aed5a705147bb2db0d7787762e389a5f34cf32d983e4bf7428471bc79b8eea7) |
| 20 | IU #37 | [`0xb9ccbe40...a054058d`](https://wirefluidscan.com/tx/0xb9ccbe4011434b40edc6d3a48a53c76448d8a70a2a4a5a1ebf8f84a9a054058d) |
| 21 | IU #38 | [`0x4ac2f855...8839aba4`](https://wirefluidscan.com/tx/0x4ac2f8559cb68230d1560a4ba28efd26c3186e43b9fbcd43e0519f5b8839aba4) |
| 22 | IU #39 | [`0x9cae99a5...2af5c436`](https://wirefluidscan.com/tx/0x9cae99a5fd41a2de2fff2aef92eaae543dcab9aed8171dcab4e3cdde2af5c436) |
| 23 | IU #40 | [`0xad88ea8a...3516ddff`](https://wirefluidscan.com/tx/0xad88ea8aa389d80381759a141bc90c074a9dcc374d365026219996b13516ddff) |
| 24 | IU #41 | [`0xf2078ab0...cd1f8b0e`](https://wirefluidscan.com/tx/0xf2078ab08cd17fd7795af221f0ca90848244d1c6069af79f671884d6cd1f8b0e) |
| 25 | IU #42 | [`0x95b50f82...ac0f0824`](https://wirefluidscan.com/tx/0x95b50f82bf7c675f5ccc818884c237be1725ec56afe5a82b1e240567ac0f0824) |
| 26 | IU #43 | [`0x5df34d38...5ab768f5`](https://wirefluidscan.com/tx/0x5df34d380f693a5ab12ffab6fd6fac36b1176190a2cb2cfcdbd676f55ab768f5) |
| 27 | IU #44 | [`0x37c03120...4a8d75de`](https://wirefluidscan.com/tx/0x37c03120b631691f2958077aa752c25fb81217e6c70f1b3eeee5468c4a8d75de) |
| 28 | IU #45 | [`0x4ade87ad...698debb8`](https://wirefluidscan.com/tx/0x4ade87adef0eecef8ac103c1ba78e890c7585554110c5dd9a46e4a0e698debb8) |
| 29 | IU #46 | [`0x6bf6a994...d8d6e880`](https://wirefluidscan.com/tx/0x6bf6a994924c34e2d47a78cfa0552a9ba07143f454de221d57df5479d8d6e880) |
| 30 | IU #47 | [`0x5b59f07b...a61ba5ae`](https://wirefluidscan.com/tx/0x5b59f07b98de0a3b1b611dca31773ce285b97b995915eb53909e5c45a61ba5ae) |
| 31 | IU #48 | [`0x8e43de49...141a7e47`](https://wirefluidscan.com/tx/0x8e43de4919646c8b576c7068eb679c52a13eae5b268e13b46d3c2e48141a7e47) |
| 32 | IU #49 | [`0xb5d1fb3d...5c7f9b15`](https://wirefluidscan.com/tx/0xb5d1fb3de948c8e4287e04248eff0cfbc758da33ef2be0c72ce6ab415c7f9b15) |
| 33 | IU #50 | [`0x15211225...6996db81`](https://wirefluidscan.com/tx/0x1521122564e79d928643021bb84dd6c7936d7d794cf553b3409e98476996db81) |

</details>

<details>
<summary>S6 — Rapid-fire LQ buys (50 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | LQ #1 | [`0x702de9e2...5101a287`](https://wirefluidscan.com/tx/0x702de9e210bdf70d0b44474bcc79c1bcd7d96652a9963de483926fef5101a287) |
| 2 | LQ #2 | [`0x2dd67b48...5978de57`](https://wirefluidscan.com/tx/0x2dd67b48e26b4f1085c0356399031dd2f1288b2b7cba43749aab785f5978de57) |
| 3 | LQ #3 | [`0x40e603fc...b2ad4e73`](https://wirefluidscan.com/tx/0x40e603fce5419bc2cf5a08162891436b2e454e940281afa41414aa55b2ad4e73) |
| 4 | LQ #4 | [`0x88501858...026fe51d`](https://wirefluidscan.com/tx/0x885018582bd3e4af5be725bb08930712b88d505d69e6dbb324aff3d6026fe51d) |
| 5 | LQ #5 | [`0x33538119...a8106e86`](https://wirefluidscan.com/tx/0x33538119ea9cc374169384138697867e0d18b5f0281dc6361646c0ada8106e86) |
| 6 | LQ #6 | [`0x04bf6326...dfe20bae`](https://wirefluidscan.com/tx/0x04bf632606a2027c73c925aa138015027b961e6190a55f103f94680ddfe20bae) |
| 7 | LQ #7 | [`0x7405281b...3ae90290`](https://wirefluidscan.com/tx/0x7405281b4d653c214189c49ffe1d05c6818c6140ec828052c2bb69243ae90290) |
| 8 | LQ #8 | [`0x67324a19...601e1920`](https://wirefluidscan.com/tx/0x67324a19f38c8f63d4daae613ebcafa6ef352449a6d6362bd1489ee2601e1920) |
| 9 | LQ #9 | [`0x5f4c16d6...3f662373`](https://wirefluidscan.com/tx/0x5f4c16d6e7f49ba6152584de324d66e4a8d581bc0f402ea10c1cc53c3f662373) |
| 10 | LQ #10 | [`0xbf9291d8...a98b4aa3`](https://wirefluidscan.com/tx/0xbf9291d8f00e1a4207362e9d2362342d7cfb41aa344ba574da9d9fd4a98b4aa3) |
| 11 | LQ #11 | [`0x10fb44d9...bb019ff7`](https://wirefluidscan.com/tx/0x10fb44d966b79049226aaacee137e17f9312df123cf1caf59dae955abb019ff7) |
| 12 | LQ #12 | [`0x22afcbc5...54468fde`](https://wirefluidscan.com/tx/0x22afcbc5d79589c14cb13fd88c0657f86db50493db5f61e5b687c92f54468fde) |
| 13 | LQ #13 | [`0xe01cd081...a21bafda`](https://wirefluidscan.com/tx/0xe01cd0814b627766acfdedeb266cd7fb224e44eb137421c17e8755f4a21bafda) |
| 14 | LQ #14 | [`0x4876edeb...774d15c7`](https://wirefluidscan.com/tx/0x4876edeb437f4aed5df0db8cb7ea84b946a01eb5fa397eaee929142b774d15c7) |
| 15 | LQ #15 | [`0x94e145fd...30201bd5`](https://wirefluidscan.com/tx/0x94e145fd76426357fe95ae288218b1a1e8dac0ef9cad41749b7fc5f030201bd5) |
| 16 | LQ #16 | [`0xce8583e2...8e553785`](https://wirefluidscan.com/tx/0xce8583e2a283c8fba1f508cda3b79d06ec64869c5de0bf2fe84c2c318e553785) |
| 17 | LQ #17 | [`0x0a03e5ef...344643dc`](https://wirefluidscan.com/tx/0x0a03e5ef27b40f0eccbc84cb7132a2471ea555c68b68bbd0304a1618344643dc) |
| 18 | LQ #18 | [`0x2a80f19c...accb3ce8`](https://wirefluidscan.com/tx/0x2a80f19c738246dc1f87ed61e09550ba5f711e324f460c6168cdc531accb3ce8) |
| 19 | LQ #19 | [`0x1e1f9489...714e7fba`](https://wirefluidscan.com/tx/0x1e1f94891561369c3b9569cc9574816f6154b9b69c1cfe9c16e4c2e4714e7fba) |
| 20 | LQ #20 | [`0xdba01e2a...a0db5d81`](https://wirefluidscan.com/tx/0xdba01e2ac72419b6d91ea5cf14ff4073a2d29df140e3c2eabd076d4fa0db5d81) |
| 21 | LQ #21 | [`0xe7288ff0...9d112654`](https://wirefluidscan.com/tx/0xe7288ff07a8f339cc13e6beaaca1c52772d6c4d3676b489e513bc5919d112654) |
| 22 | LQ #22 | [`0x3eaf8bad...12fa076d`](https://wirefluidscan.com/tx/0x3eaf8bad3c2aeb91fcddfacfb9c54cfb4fba94dbbb9799c3a49cc58d12fa076d) |
| 23 | LQ #23 | [`0x2c012f2c...65e0354c`](https://wirefluidscan.com/tx/0x2c012f2cdf3fbf02346e45da64c395dff7cdb99af9a2277b30ee213f65e0354c) |
| 24 | LQ #24 | [`0x8ef6de4b...db32e1c6`](https://wirefluidscan.com/tx/0x8ef6de4b787d0393e97cd7aec1e433b1edfda8a8b4b66ed086a7ece4db32e1c6) |
| 25 | LQ #25 | [`0xed6e2a07...4b18176c`](https://wirefluidscan.com/tx/0xed6e2a079150eeddbb12085c15a4e8f88cbc362a5edfd3e809b1cb0c4b18176c) |
| 26 | LQ #26 | [`0x812f6d38...2eb03d2e`](https://wirefluidscan.com/tx/0x812f6d3851e6c68ce0db1d32cdaf11c482ecd09dfcbf16d226291bf92eb03d2e) |
| 27 | LQ #27 | [`0x0a4c1c89...fe15a1a4`](https://wirefluidscan.com/tx/0x0a4c1c893bd6b22a4a242dd440a5802d74f27e92acfbd22cb1cbbb70fe15a1a4) |
| 28 | LQ #28 | [`0x747357c9...71276b99`](https://wirefluidscan.com/tx/0x747357c9e0f144a0f9b884c0f29278eafc6a9db388510d6b28c6692371276b99) |
| 29 | LQ #29 | [`0xaf983879...36086dfd`](https://wirefluidscan.com/tx/0xaf9838797575aed751986ba044e6a524937fd3849a8806ac3b213da436086dfd) |
| 30 | LQ #30 | [`0x7299bf68...d72695fd`](https://wirefluidscan.com/tx/0x7299bf685cd1e4193fc3fc6e7addbcdcefbee4481bda6e96ace9a6cad72695fd) |
| 31 | LQ #31 | [`0x5eb2e62d...2bcfbe74`](https://wirefluidscan.com/tx/0x5eb2e62d7464a971f971ac1bfd55f2007937f19d10fdf7fa4a73d9a52bcfbe74) |
| 32 | LQ #32 | [`0xb4069adb...26c1b636`](https://wirefluidscan.com/tx/0xb4069adba0ef49718509dbaea4668843c1ad857729d1f89aed66fe4b26c1b636) |
| 33 | LQ #33 | [`0x9041707d...e5006d71`](https://wirefluidscan.com/tx/0x9041707d81fba6d516ca4d03d4fd75f6a31df7d9503461b0e9147d0de5006d71) |
| 34 | LQ #34 | [`0x1abd21c7...42571409`](https://wirefluidscan.com/tx/0x1abd21c7610c7fad5cc8f77ffea84b5f0c09fb2ee48e81da130083c342571409) |
| 35 | LQ #35 | [`0x7255b64c...5030ab55`](https://wirefluidscan.com/tx/0x7255b64ca9fa67452ed17f48972c4b02e53665add2d367f21897e2da5030ab55) |
| 36 | LQ #36 | [`0x53a67804...59fc3a6f`](https://wirefluidscan.com/tx/0x53a678046f8027a0f86ab0fc30f11e73aa0f69793694b6d1bef527d059fc3a6f) |
| 37 | LQ #37 | [`0x6c1dde48...f8dd499c`](https://wirefluidscan.com/tx/0x6c1dde4893e38e0142e9f1269111aff92a59125084fd29cf38c5d63bf8dd499c) |
| 38 | LQ #38 | [`0x97359395...e7af664f`](https://wirefluidscan.com/tx/0x97359395cb79bc08447560c8bb407956bf179d354a0a28c0d0e6ab0be7af664f) |
| 39 | LQ #39 | [`0xe9a5b952...e99655f6`](https://wirefluidscan.com/tx/0xe9a5b952d9eac2815cc1f2cd8c4efbc77f2efa0db557cfe850e1bc11e99655f6) |
| 40 | LQ #40 | [`0xdd6458d3...5e1cf0ba`](https://wirefluidscan.com/tx/0xdd6458d37d93922c460868d045d922f81ec8031e19beea04d78086915e1cf0ba) |
| 41 | LQ #41 | [`0xf2bfe6a4...af7d4806`](https://wirefluidscan.com/tx/0xf2bfe6a4be7f97c293de55aa7ef62676c0e1a9e8aac7cde5f0871505af7d4806) |
| 42 | LQ #42 | [`0x6ada8e62...ecf68093`](https://wirefluidscan.com/tx/0x6ada8e62f636fd0673a075c800540b8bb6db19f9753ce990c4da92cbecf68093) |
| 43 | LQ #43 | [`0xfb8c72ed...9f5f712b`](https://wirefluidscan.com/tx/0xfb8c72ed92b1103ec7640fb45e483e3a4a347d5b22a8616f5fcad4399f5f712b) |
| 44 | LQ #44 | [`0x87dd455e...a8cf74b4`](https://wirefluidscan.com/tx/0x87dd455e0ef13fa2e51880a299c62f81ca3cc963b8a04b877b2a6ebda8cf74b4) |
| 45 | LQ #45 | [`0x87a3bb3f...d2e781b7`](https://wirefluidscan.com/tx/0x87a3bb3fb81fef698a8ae45060c17075b4167894b02a548f04b50a1bd2e781b7) |
| 46 | LQ #46 | [`0x178f439a...9f5e6dfa`](https://wirefluidscan.com/tx/0x178f439af982da0fd5ed079695e2595df835b9778b68b4a71ea7e3e99f5e6dfa) |
| 47 | LQ #47 | [`0x81cd7507...18869974`](https://wirefluidscan.com/tx/0x81cd75075f414add9ac6e0e25efc398359f95822dc313c4f110b4ae818869974) |
| 48 | LQ #48 | [`0x622b2d60...16d4f5c3`](https://wirefluidscan.com/tx/0x622b2d601fdfd2f44275e4bd30b0dd8682a6a8833a77a7cdeb3de4d516d4f5c3) |
| 49 | LQ #49 | [`0x630092fa...479b0af9`](https://wirefluidscan.com/tx/0x630092faa59c5a601730b9f14b99eab46ce18ae4a948565986646824479b0af9) |
| 50 | LQ #50 | [`0xfcf87ace...f7114d99`](https://wirefluidscan.com/tx/0xfcf87ace32f0977e9d8cfd3f9ab3886a115f6d4684fbd5fbf3badaebf7114d99) |

</details>

<details>
<summary>S7 — Rapid-fire MS buys (50 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | MS #1 | [`0xd011edaa...ae736db6`](https://wirefluidscan.com/tx/0xd011edaa7b75c60f065cd397f09bbe84b2040d19ece2e4abb68f07eaae736db6) |
| 2 | MS #2 | [`0x5235745f...946089f7`](https://wirefluidscan.com/tx/0x5235745fb0325b00a499e4a745ae32ade6244a9236687aeda7bea33a946089f7) |
| 3 | MS #3 | [`0x3bd16a10...a6575273`](https://wirefluidscan.com/tx/0x3bd16a10e286bbaffb5985ed5acdb1ac996aa12aefc63fad020af310a6575273) |
| 4 | MS #4 | [`0xd9c6eafd...8f37fc3b`](https://wirefluidscan.com/tx/0xd9c6eafd02e4835ddc061df4c163576bdc250f0accda817ccd9ea15f8f37fc3b) |
| 5 | MS #5 | [`0x559d7538...f9de7f2b`](https://wirefluidscan.com/tx/0x559d7538472eec331c7c4888e47b306747f20168911e4b6455bfeccdf9de7f2b) |
| 6 | MS #6 | [`0xf9d5db81...5f770a90`](https://wirefluidscan.com/tx/0xf9d5db814d933e975010a00597faca1b506864e14f96eb58163ead6a5f770a90) |
| 7 | MS #7 | [`0xaba6be36...7ce4ce1c`](https://wirefluidscan.com/tx/0xaba6be367de06713f6f93ff379a7952936a7abbd7c3f3405c4e5209a7ce4ce1c) |
| 8 | MS #8 | [`0x2c367c0a...75dd3a0b`](https://wirefluidscan.com/tx/0x2c367c0a35a5a46520e45ebeb1f05b7ddfc366e5408493f47a607da275dd3a0b) |
| 9 | MS #9 | [`0x6a08e730...a121d7d9`](https://wirefluidscan.com/tx/0x6a08e73076c83a94b43161ada342c146349b9638ccb058bb593b13f8a121d7d9) |
| 10 | MS #10 | [`0x02c4647f...7b3b0f8f`](https://wirefluidscan.com/tx/0x02c4647f9d2574aabaa014152c964c06003b5bb2a6fe31f49cd3bbdd7b3b0f8f) |
| 11 | MS #11 | [`0x946da1d7...ce2b5bdc`](https://wirefluidscan.com/tx/0x946da1d728f99037b8927ada31d610390ced6464b5b681e2e20abfb5ce2b5bdc) |
| 12 | MS #12 | [`0xb32e4cc5...4f2d3286`](https://wirefluidscan.com/tx/0xb32e4cc595dbb210d5f601963428a08198277ff0625859a06a7225434f2d3286) |
| 13 | MS #13 | [`0x6331d951...eb0c887f`](https://wirefluidscan.com/tx/0x6331d951b3ba7ac39503f32fc3be4502eb26005e7eafe7b20f179540eb0c887f) |
| 14 | MS #14 | [`0x40574278...8d965b24`](https://wirefluidscan.com/tx/0x40574278cc2f49e72aeb98557a965485d6e0ff42ea0ab7ebfd30d5118d965b24) |
| 15 | MS #15 | [`0x0df79fd1...0cdff143`](https://wirefluidscan.com/tx/0x0df79fd18cf321362c5eef7c4d12f56240a50e111343bbaf7cf72b0e0cdff143) |
| 16 | MS #16 | [`0x2c7002f1...8b1d6d82`](https://wirefluidscan.com/tx/0x2c7002f132fb6ee710e3162fcfad9de0700f74f4a4405c45f835290f8b1d6d82) |
| 17 | MS #17 | [`0x45dc9733...73f81baf`](https://wirefluidscan.com/tx/0x45dc97335c12d13f65a0be31bd21ad3cbf741186650a0793385c0dcc73f81baf) |
| 18 | MS #18 | [`0xbaa5e50e...de2b629c`](https://wirefluidscan.com/tx/0xbaa5e50ea7a11488a285ca3fce303032541c9203a15566148537d757de2b629c) |
| 19 | MS #19 | [`0x445213ae...a5a43d4b`](https://wirefluidscan.com/tx/0x445213ae6894c6eb56392952ba26435e322507a53202356991c54192a5a43d4b) |
| 20 | MS #20 | [`0xe3dec7d3...1d2fa63f`](https://wirefluidscan.com/tx/0xe3dec7d330abcc004df726aa335e35d92ad744ab7adab4ea075c579c1d2fa63f) |
| 21 | MS #21 | [`0xd0e8240d...be408272`](https://wirefluidscan.com/tx/0xd0e8240d85cb08fb4bc46b6b33425f12f7442fc9d899c26c6a76bf96be408272) |
| 22 | MS #22 | [`0x5e63c85e...57811c35`](https://wirefluidscan.com/tx/0x5e63c85ea5ab7a90d2807fa6c12bdbf9533568c610d9d5b7e3cd94e757811c35) |
| 23 | MS #23 | [`0x55adde2d...a312c6cc`](https://wirefluidscan.com/tx/0x55adde2d15bce40589f79f7badfe8ed55de3e8cfa6f29909a57e04e9a312c6cc) |
| 24 | MS #24 | [`0xc9022669...230b260e`](https://wirefluidscan.com/tx/0xc90226690ac2fa07b6428c9d8464bdb0e577312045717c80570c0a4d230b260e) |
| 25 | MS #25 | [`0x1f341e24...36dab5fc`](https://wirefluidscan.com/tx/0x1f341e249abc51a7e46bd72dd50af4c5db5a71d86bbd65de2f30da3436dab5fc) |
| 26 | MS #26 | [`0x96a97f95...e8864f4e`](https://wirefluidscan.com/tx/0x96a97f9545cf92881572d940dfec69cb8f2f8157c4b128f13074350ce8864f4e) |
| 27 | MS #27 | [`0x5effaf8b...d2bcdce5`](https://wirefluidscan.com/tx/0x5effaf8bbac94fc3e2bc23b7c8653465e2beeffb0a50079a40a34e2dd2bcdce5) |
| 28 | MS #28 | [`0xb868b6c1...22e620e6`](https://wirefluidscan.com/tx/0xb868b6c1f650432283e909778ebb1684fe373b43fa0c141081055d1422e620e6) |
| 29 | MS #29 | [`0xbdd4cf12...32e717da`](https://wirefluidscan.com/tx/0xbdd4cf12261873a58914215b1a5b83b9f10c3c101f315726685de8ef32e717da) |
| 30 | MS #30 | [`0x74e5249c...15bd9656`](https://wirefluidscan.com/tx/0x74e5249cdbf07d49221502765262a1916c08110f442238e84c8437f515bd9656) |
| 31 | MS #31 | [`0x38d34ee9...a948ff08`](https://wirefluidscan.com/tx/0x38d34ee920322ea47851e4b8268b0fa9a480a1f40c240bea7f941f07a948ff08) |
| 32 | MS #32 | [`0xc12da82a...38a8f709`](https://wirefluidscan.com/tx/0xc12da82a5eedde65dbbbc9d7d6fed2af75c2742a973b728830c037f238a8f709) |
| 33 | MS #33 | [`0x76ecb7c7...ae42fa63`](https://wirefluidscan.com/tx/0x76ecb7c721d491863197ddd99cf444fafd2a23cb76f5ba90ef6964daae42fa63) |
| 34 | MS #34 | [`0x206c8173...ed0a1795`](https://wirefluidscan.com/tx/0x206c8173fc2981f98334033ff2206d994cda469837a97f505eda4017ed0a1795) |
| 35 | MS #35 | [`0x2a02d8ba...dd6aa0a2`](https://wirefluidscan.com/tx/0x2a02d8ba0299a7b9d67cadcedd4428a525b04c587052396172f9085cdd6aa0a2) |
| 36 | MS #36 | [`0xa8b75d0c...ea4395cf`](https://wirefluidscan.com/tx/0xa8b75d0c6f75582af5ef610a41f8c5b583973dcdae7ccc5790c3ec26ea4395cf) |
| 37 | MS #37 | [`0xcdb2394f...d088c453`](https://wirefluidscan.com/tx/0xcdb2394f0ca3830c67fb0d9a3b332e684e0ae89296b9c6791ccf04d9d088c453) |
| 38 | MS #38 | [`0x7f20bf90...423851f7`](https://wirefluidscan.com/tx/0x7f20bf90308218a8d511c7ca9a426ffdff1e1cab26de937b084047c3423851f7) |
| 39 | MS #39 | [`0xa27eb2d0...53f09d63`](https://wirefluidscan.com/tx/0xa27eb2d064aba645f73cf240deb9459b0100279ca6e796053fc0e51c53f09d63) |
| 40 | MS #40 | [`0x08488adb...6b8f867b`](https://wirefluidscan.com/tx/0x08488adb2b574199151645901e439620124b717b7da3d3dbf6d8c32f6b8f867b) |
| 41 | MS #41 | [`0x9e55560e...068b8ce6`](https://wirefluidscan.com/tx/0x9e55560e76865d674af4f0454ae655d6c0c5cc3bcd0abfafbecb94f7068b8ce6) |
| 42 | MS #42 | [`0xbe94c58b...0b8ac423`](https://wirefluidscan.com/tx/0xbe94c58bdd2d692c24d7026d124dca5988ae321a0bc07eeaa0e21b300b8ac423) |
| 43 | MS #43 | [`0x4cdbb22c...e5e5acc5`](https://wirefluidscan.com/tx/0x4cdbb22c28e48e6a56abe26bbe3d0d6cf0929e5fbf05019c4df3136ce5e5acc5) |
| 44 | MS #44 | [`0xe47acd75...aca17206`](https://wirefluidscan.com/tx/0xe47acd754b77e4055818217342b27cb74f6320674f2da9bc30407c6aaca17206) |
| 45 | MS #45 | [`0x6b040271...4dbb36e8`](https://wirefluidscan.com/tx/0x6b0402711af6779b45244fafe5d97389ade3da8f6dd6564c815e61344dbb36e8) |
| 46 | MS #46 | [`0x5a8c56b1...054a52d3`](https://wirefluidscan.com/tx/0x5a8c56b169b423e37b7666ab1dada11770512e0f2dbd64581923691d054a52d3) |
| 47 | MS #47 | [`0x71f628eb...51f87096`](https://wirefluidscan.com/tx/0x71f628eb95d69f1594657c8ce8539b6db57336c944879257ce8fb7b351f87096) |
| 48 | MS #48 | [`0xe5edd651...8233de80`](https://wirefluidscan.com/tx/0xe5edd6512490b7db858dfc03dd5503e5426f93798077020f178d858a8233de80) |
| 49 | MS #49 | [`0x53a2670b...f50c89ed`](https://wirefluidscan.com/tx/0x53a2670b646300f11b8b0d6102b6a0455da757f6901fa3b28a740743f50c89ed) |
| 50 | MS #50 | [`0x2a362180...bf84b911`](https://wirefluidscan.com/tx/0x2a362180bd514e2e22f1aa2a50cb5a4d35146518d232fed4b0a8d07ebf84b911) |

</details>

<details>
<summary>S8 — Rapid-fire KK buys (50 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | KK #1 | [`0x07ce184b...acf9f94a`](https://wirefluidscan.com/tx/0x07ce184b7074506ee0236214e4f2d45feb2c623564aa7435c3b92c34acf9f94a) |
| 2 | KK #2 | [`0xc15d7e74...d298d160`](https://wirefluidscan.com/tx/0xc15d7e74b453c5ca57c24edd3cd18aa8d0704098df98f7a40f5457f4d298d160) |
| 3 | KK #3 | [`0xc326e129...301ac4f3`](https://wirefluidscan.com/tx/0xc326e129f1a11b8b802cfa47da5c9b25a33eb057d70f156ed2d9d3f5301ac4f3) |
| 4 | KK #4 | [`0x89f1b7f1...8756d75c`](https://wirefluidscan.com/tx/0x89f1b7f179c712f17f6c2342f3971429f9cf7f4eda24a912cb18daf28756d75c) |
| 5 | KK #5 | [`0x0ebd5ab7...a546076d`](https://wirefluidscan.com/tx/0x0ebd5ab70d90d4989b8b806f4da2bba7ecb46d165f2f396f7b7d00d5a546076d) |
| 6 | KK #6 | [`0xd4f42a99...cde48174`](https://wirefluidscan.com/tx/0xd4f42a998574e9d0602349b5b1239082ff8e42ddc6acbecc77643d37cde48174) |
| 7 | KK #7 | [`0xbdb9f5a3...571e803f`](https://wirefluidscan.com/tx/0xbdb9f5a31c7cca7fefd3a0a065a593c28027d9321fc22c5ad2d603e8571e803f) |
| 8 | KK #8 | [`0x737143a9...85a6e551`](https://wirefluidscan.com/tx/0x737143a95f0055f3425adbb48cdc84744a02364f3cc3289352d246aa85a6e551) |
| 9 | KK #9 | [`0x239a5076...8d165c83`](https://wirefluidscan.com/tx/0x239a50762c64ae1af74460ec91ea2be2cd5a274a639efe1eb71bbc1e8d165c83) |
| 10 | KK #10 | [`0x7c5eb90b...fecc5e7d`](https://wirefluidscan.com/tx/0x7c5eb90b78c0c36a61442f880e152381316186f75399ac7018cfb37dfecc5e7d) |
| 11 | KK #11 | [`0xb554f363...3bf434fb`](https://wirefluidscan.com/tx/0xb554f363feb91a459d89d0acd8654caecbd5ecc2640847e10d7902723bf434fb) |
| 12 | KK #12 | [`0x2d1ec81d...982a3269`](https://wirefluidscan.com/tx/0x2d1ec81dd0130643853e4129f42f067ee8b686fd1f5a93f6dd92d32a982a3269) |
| 13 | KK #13 | [`0x7ca3ab05...19231912`](https://wirefluidscan.com/tx/0x7ca3ab055e305a952efce94d4a3335589597ec8294d8220a5f7eafb219231912) |
| 14 | KK #14 | [`0x92f941c3...bc820470`](https://wirefluidscan.com/tx/0x92f941c3d62431087a6b16ce58f7ca59910ceac0b92c176848361760bc820470) |
| 15 | KK #15 | [`0xddaeae7d...9d60f9ba`](https://wirefluidscan.com/tx/0xddaeae7db93631c7b529814ac4e3d6cfa7711d9c21fb9dc66e385dda9d60f9ba) |
| 16 | KK #16 | [`0xf5713546...abc5e14f`](https://wirefluidscan.com/tx/0xf57135461a8ecb6c2242876305f6a94d19c5116b812424280ea13bafabc5e14f) |
| 17 | KK #17 | [`0xa6eef5d8...8636f056`](https://wirefluidscan.com/tx/0xa6eef5d8a3c99b60999b1542aec44773e23917590b51cfe9317936c48636f056) |
| 18 | KK #18 | [`0x11febbc1...689a285b`](https://wirefluidscan.com/tx/0x11febbc167e658e4eca9e8fad5b4eb836bea832b804fd0e65cfe8ffd689a285b) |
| 19 | KK #19 | [`0x859f1696...31316c43`](https://wirefluidscan.com/tx/0x859f16969866b813137cc22896fa1fc7e2c512b7b9138d93f98dbe2031316c43) |
| 20 | KK #20 | [`0x6d3063e6...607f2f41`](https://wirefluidscan.com/tx/0x6d3063e670458efb0af6aef7c53412f9f97615c9b39df99399ca7f71607f2f41) |
| 21 | KK #21 | [`0x2d037bcf...b5661ba9`](https://wirefluidscan.com/tx/0x2d037bcf07ced82bbc3cbd34dcc3742167dd9fb8677f4075f422a511b5661ba9) |
| 22 | KK #22 | [`0xae169bb1...e99a8dac`](https://wirefluidscan.com/tx/0xae169bb1c2b2ec61994c3b8d4d6be1c13f10c50da4f40604b60d4ed7e99a8dac) |
| 23 | KK #23 | [`0xd8e789a3...ffd57053`](https://wirefluidscan.com/tx/0xd8e789a325cddf59cff0e0a37e03b646948a1de8d03a9f87d3036791ffd57053) |
| 24 | KK #24 | [`0x5509b7e1...95a1b828`](https://wirefluidscan.com/tx/0x5509b7e1f2f163226ff7edf46282104b57a349fe717d8df463f838a595a1b828) |
| 25 | KK #25 | [`0x23fdf036...9a963ec1`](https://wirefluidscan.com/tx/0x23fdf036cd0ed6a6aaf7e1c07beec78fff14b66fefbaaa9025b707df9a963ec1) |
| 26 | KK #26 | [`0x0120dc00...ac63efa1`](https://wirefluidscan.com/tx/0x0120dc00bd78216d60a6adc1a5214f8c6ae955e2600b29af67c897d4ac63efa1) |
| 27 | KK #27 | [`0x12d2c583...4dbf41c6`](https://wirefluidscan.com/tx/0x12d2c5834f72c5df45b64157daf97936cada9b575e575042523b031d4dbf41c6) |
| 28 | KK #28 | [`0x4a8d568c...bf7083e2`](https://wirefluidscan.com/tx/0x4a8d568c9d23d368d4cf728db7f39f8f0bed152b845ab3e56aab3b1ebf7083e2) |
| 29 | KK #29 | [`0xeb9641c0...538f641d`](https://wirefluidscan.com/tx/0xeb9641c0242f2ac7ad7ca1dc2de22e4a9f332d2d7f4f761b08dce747538f641d) |
| 30 | KK #30 | [`0xf3638ed3...5bb7e5cc`](https://wirefluidscan.com/tx/0xf3638ed379741bfda3c6b3ebc1a52c0439a5de925ac0538cc9f197555bb7e5cc) |
| 31 | KK #31 | [`0x403dcf66...40acc48c`](https://wirefluidscan.com/tx/0x403dcf666a08d9dafc15d7581da236893cf76db9ddd0a0e467bf399740acc48c) |
| 32 | KK #32 | [`0x7503bdb8...d690e6b5`](https://wirefluidscan.com/tx/0x7503bdb87b546d092ad1a9707f0e4482a2fb229c3c6a63a033cf0191d690e6b5) |
| 33 | KK #33 | [`0xa8d1cb1a...03052c6d`](https://wirefluidscan.com/tx/0xa8d1cb1ab3c3bfd2e0f8be3434415857d2aba2c91e12f497f5f6f81003052c6d) |
| 34 | KK #34 | [`0x4600b182...b8a915b8`](https://wirefluidscan.com/tx/0x4600b1822a7320280af0eeea22189c9a3615ae169c5a70b773aab1f5b8a915b8) |
| 35 | KK #35 | [`0xda094917...085222d6`](https://wirefluidscan.com/tx/0xda09491798cc19a5b523c67cf7cf9d9d61016bf79bfa434a5359a264085222d6) |
| 36 | KK #36 | [`0x1b5799cd...c4b253cb`](https://wirefluidscan.com/tx/0x1b5799cd199459fb78f30d287c83cd98a77f701d782734d4d581af22c4b253cb) |
| 37 | KK #37 | [`0x04b95afe...0152edb6`](https://wirefluidscan.com/tx/0x04b95afecf525306365348ef80bdbb0348e838c54bdc523fb30cea120152edb6) |
| 38 | KK #38 | [`0xaeacd696...38d52214`](https://wirefluidscan.com/tx/0xaeacd696b23be99584419d323db47e3c547b66f19fce55c41439522838d52214) |
| 39 | KK #39 | [`0xbc8fafd0...1fc7dae5`](https://wirefluidscan.com/tx/0xbc8fafd09275d77e2712f1a108d79c323a6411dfa2050e0e218c819a1fc7dae5) |
| 40 | KK #40 | [`0xefd3f97b...c34d2a29`](https://wirefluidscan.com/tx/0xefd3f97bfccbf73fad54b2b7d732e5abac0b6a391a3a81f53968e993c34d2a29) |
| 41 | KK #41 | [`0xa969a55d...792153d3`](https://wirefluidscan.com/tx/0xa969a55d0178165bfeac58ef3739c0c520755b0de654b091eda9cddf792153d3) |
| 42 | KK #42 | [`0x95cfe415...c671565f`](https://wirefluidscan.com/tx/0x95cfe4152d71d21fea1d075829a8f28eb90afddb342821c5d9f14893c671565f) |
| 43 | KK #43 | [`0x51f60471...42ff93a3`](https://wirefluidscan.com/tx/0x51f60471710dfcc0cf75e4891e4ea53df524ddacb4ed6492978f35bd42ff93a3) |
| 44 | KK #44 | [`0xd36d28fb...b5ad1335`](https://wirefluidscan.com/tx/0xd36d28fb11fe39d0c9723a39f2312a85c9005a2411850a664117fb08b5ad1335) |
| 45 | KK #45 | [`0xc9f00592...eeec09bf`](https://wirefluidscan.com/tx/0xc9f005921f43d413f38a123d81200b3cea7135fb171bf397eac88b10eeec09bf) |
| 46 | KK #46 | [`0xeb79784b...510fab19`](https://wirefluidscan.com/tx/0xeb79784b186e4f3eebcdf74fd8bc629e2717e1fde6258ff219ef7cf3510fab19) |
| 47 | KK #47 | [`0xcd79952c...8e9a843d`](https://wirefluidscan.com/tx/0xcd79952c87836a51f66971e52c80e8aed695c50d5bed0bc542f630ba8e9a843d) |
| 48 | KK #48 | [`0x7cce94a3...9130f023`](https://wirefluidscan.com/tx/0x7cce94a366a4a91bcd2928841e1f796325115625f189049733c6c0379130f023) |
| 49 | KK #49 | [`0xaf03f64d...723b8af5`](https://wirefluidscan.com/tx/0xaf03f64d3a119079368165a6586cbde5f37dbfbeb43eedde1035128e723b8af5) |
| 50 | KK #50 | [`0x4755df46...2f3a62c8`](https://wirefluidscan.com/tx/0x4755df46803bc22b55cdbda807a7145a9278ba46beb9d5513c036c422f3a62c8) |

</details>

<details>
<summary>S9 — Buy-sell cycles 15 rounds x 8 tokens (310 txs)</summary>

| # | Action | Tx Hash |
|---|--------|---------|
| 1 | C1 Buy IU | [`0xfdb1e70d...0d0d52ff`](https://wirefluidscan.com/tx/0xfdb1e70d8643481a4dcc283c2980b3357dee11201aa2225308114c910d0d52ff) |
| 2 | C1 Buy LQ | [`0x908e8969...b83bc95e`](https://wirefluidscan.com/tx/0x908e8969d41607556536e6f4c098d8d9aab728296b5c3f4ddb79ef4cb83bc95e) |
| 3 | C1 Buy MS | [`0x7837badd...c0a59467`](https://wirefluidscan.com/tx/0x7837baddbbd7166cf0697c6bfa15721946693768789620c7685bc870c0a59467) |
| 4 | C1 Buy KK | [`0x6612a96c...7dd01aa6`](https://wirefluidscan.com/tx/0x6612a96ca2cfc61a73361ce28d0122f151b1d64080adf7ab1298cdff7dd01aa6) |
| 5 | C1 Buy PZ | [`0xeb00386e...d270e1e5`](https://wirefluidscan.com/tx/0xeb00386e93802be9aa00cb867fcaf7ceb1911928610f0f612768aaded270e1e5) |
| 6 | C1 Buy QG | [`0x799ef94c...97eec766`](https://wirefluidscan.com/tx/0x799ef94c446146f34387e582ee46366838d80328b891c5f3477c30d297eec766) |
| 7 | C1 Buy HK | [`0x5165623b...55a73663`](https://wirefluidscan.com/tx/0x5165623bb54b3a581adac74fca527d4dd0a5d6e77b19356a99cc404e55a73663) |
| 8 | C1 Buy RW | [`0xad92fd41...e8ab4e00`](https://wirefluidscan.com/tx/0xad92fd41107b66d6dd3346dce7d55a90aac3bb56d7556ffda3f3d882e8ab4e00) |
| 9 | C1 Appr IU | [`0xacb4406d...e6e13cf4`](https://wirefluidscan.com/tx/0xacb4406d42aa4d7df90745cea3d64e35d56854d9cf6e7aa9c9fc41e1e6e13cf4) |
| 10 | C1 Sell IU | [`0xed0da2e0...5fb388ba`](https://wirefluidscan.com/tx/0xed0da2e05a1294a2ae10e354c779fb8fb1918ef9729342608d5bf85b5fb388ba) |
| 11 | C1 Appr LQ | [`0xd5c2e389...9dd5cca3`](https://wirefluidscan.com/tx/0xd5c2e3893b9c6485d35e2833ed80b5c6848a5f8d98aeff90d995d50c9dd5cca3) |
| 12 | C1 Sell LQ | [`0x9a9974d4...6de987d0`](https://wirefluidscan.com/tx/0x9a9974d4aa31e5c62401fb1df169da453fae08643b44e127e5be75316de987d0) |
| 13 | C1 Appr MS | [`0x51fb436f...1542e174`](https://wirefluidscan.com/tx/0x51fb436f9eee39633bad1ee321c1fb6c4094925477ec937ed353c9481542e174) |
| 14 | C1 Sell MS | [`0xa6163320...bf0fe38e`](https://wirefluidscan.com/tx/0xa61633209e5cc32a17f6e5f35e6fa24fe69675e2aa85802a5a7d7281bf0fe38e) |
| 15 | C1 Appr KK | [`0xb2a9444f...13e2fb17`](https://wirefluidscan.com/tx/0xb2a9444fc5a2a2eeadb229df0b7366943088b63bc56f99d328dff16c13e2fb17) |
| 16 | C1 Sell KK | [`0xc7528abf...d6d76e4e`](https://wirefluidscan.com/tx/0xc7528abf92ead13987611ead789cfc6db92cce066f6dffd5b909cd96d6d76e4e) |
| 17 | C1 Appr PZ | [`0xfbe3c376...6df00649`](https://wirefluidscan.com/tx/0xfbe3c376b309bd5add61c6bf40da9e90e0845338da86adfedb55b5f26df00649) |
| 18 | C1 Sell PZ | [`0xf2e05d7f...66a3335e`](https://wirefluidscan.com/tx/0xf2e05d7f08132e08b2adbeb5c925f1ea1afe841bd5ab77186500a60d66a3335e) |
| 19 | C1 Appr QG | [`0x9af66564...add22f38`](https://wirefluidscan.com/tx/0x9af6656460cb53adf970e095ee614c14875ffb5b2ecc23b96b415711add22f38) |
| 20 | C1 Sell QG | [`0x0621a519...cc792b28`](https://wirefluidscan.com/tx/0x0621a5194b5ed992fad2abb477a769ad656da892ced61fc321a2784dcc792b28) |
| 21 | C1 Appr HK | [`0x7d5c520d...792fe331`](https://wirefluidscan.com/tx/0x7d5c520d389d2de6272a562e7271eb91c296ce562350933e601adfb1792fe331) |
| 22 | C1 Sell HK | [`0x8cc49776...aa6a598c`](https://wirefluidscan.com/tx/0x8cc497762d7a70ff8e07fad472106cf0b2733dcc12e415572259df65aa6a598c) |
| 23 | C1 Appr RW | [`0xf8dae659...fe7312ec`](https://wirefluidscan.com/tx/0xf8dae6598c7d46fdbaadf032906ce0cc595c06049d75966677ee1005fe7312ec) |
| 24 | C1 Sell RW | [`0x7836e56d...b32277a5`](https://wirefluidscan.com/tx/0x7836e56d65ce66637431b28aaed8f15298fd1d0f97199c3e24d799b1b32277a5) |
| 25 | C2 Buy PZ | [`0x8b9ef38d...8829328e`](https://wirefluidscan.com/tx/0x8b9ef38db5ce32f7cbcc5ba8d443ec3ca454d1362d8ef0f1cc35f0828829328e) |
| 26 | C2 Buy QG | [`0x10acfab9...1a65d9e2`](https://wirefluidscan.com/tx/0x10acfab91de6d214ae4794844bc82a4677a970ce44cd822d60dbc7351a65d9e2) |
| 27 | C2 Buy HK | [`0x939201f9...86fceb5b`](https://wirefluidscan.com/tx/0x939201f955b93573f6002a84c523c8fec680307adaec2ab1d572f40186fceb5b) |
| 28 | C2 Buy RW | [`0x28727ec2...4dedfbf4`](https://wirefluidscan.com/tx/0x28727ec2b784f357c613cf082057065d2eedfaa8efbd115eb72785354dedfbf4) |
| 29 | C2 Appr IU | [`0x0d173dbd...e775c87e`](https://wirefluidscan.com/tx/0x0d173dbd411c8794bfcc3904d646d9f655bd22774a09b71e2a18bbcee775c87e) |
| 30 | C2 Appr LQ | [`0xd42eba1a...b71ab9a5`](https://wirefluidscan.com/tx/0xd42eba1a528abdc9da2bd1c70d7454b39d40df7ee9353ab4b7d521acb71ab9a5) |
| 31 | C2 Appr MS | [`0x217b44e4...ac1f199c`](https://wirefluidscan.com/tx/0x217b44e4602e59a7611bcfc0277a638edb3bcab295b7083ecc0255e1ac1f199c) |
| 32 | C2 Appr KK | [`0x005e2148...9c4d2061`](https://wirefluidscan.com/tx/0x005e2148e9ce7340fdc017bbd60fe635530dd070c70f1a5442b852a89c4d2061) |
| 33 | C2 Appr PZ | [`0x7b991598...4e8b8ff0`](https://wirefluidscan.com/tx/0x7b99159804193e99b36b325e2a17ad4884339c1389cfad756426504a4e8b8ff0) |
| 34 | C2 Sell PZ | [`0x8e65ae1a...1d985f8a`](https://wirefluidscan.com/tx/0x8e65ae1a4709b8787c0db9361f3b6b895b7fceda153ef18d19a805631d985f8a) |
| 35 | C2 Appr QG | [`0x7f8dec50...09d728c5`](https://wirefluidscan.com/tx/0x7f8dec50efd3f5cd7df8aaab5bf57f386426438f489aaebc9915b08f09d728c5) |
| 36 | C2 Sell QG | [`0x4be7c226...b5042d52`](https://wirefluidscan.com/tx/0x4be7c2262e51aefcd2174974a5b356847fd9cb71e2c7ab7f07b55b7db5042d52) |
| 37 | C2 Appr HK | [`0x7cffb184...3eb6a371`](https://wirefluidscan.com/tx/0x7cffb1841caf256b9546957852d947f5e59855463e7f901b2f3438743eb6a371) |
| 38 | C2 Sell HK | [`0xec1310fe...1d1197a8`](https://wirefluidscan.com/tx/0xec1310fe07806818aee93c11acd181720654d5324b21c054d260081f1d1197a8) |
| 39 | C2 Appr RW | [`0xd0a81828...0c5881f6`](https://wirefluidscan.com/tx/0xd0a8182832a91c17a4d31dd77a2e17656b6d1e2902c95db996e167f70c5881f6) |
| 40 | C2 Sell RW | [`0x2685380d...6f5854b1`](https://wirefluidscan.com/tx/0x2685380dc71be6fc1ad7c1f527eb38d12c81986c21f6d45b780fd37d6f5854b1) |
| 41 | C3 Buy IU | [`0xb99e2afa...97712758`](https://wirefluidscan.com/tx/0xb99e2afa7c8f5b42d66e83cc1834b88ca89522921e86643e859ba2e197712758) |
| 42 | C3 Buy LQ | [`0x39656b5c...be9d941e`](https://wirefluidscan.com/tx/0x39656b5cc54f515145ffa282245a96a07b8ff367985e30fe39a8d8e9be9d941e) |
| 43 | C3 Buy MS | [`0xb13a73a7...317f4c8f`](https://wirefluidscan.com/tx/0xb13a73a7fff69171245c0c24dbe3b7146f3a52963a57b87dc78744e7317f4c8f) |
| 44 | C3 Buy KK | [`0x34bd0cfd...206d0bd9`](https://wirefluidscan.com/tx/0x34bd0cfdbec568b131b4031ec624373fd47b038b6ee4b5e4efb6b021206d0bd9) |
| 45 | C3 Buy PZ | [`0xb17b3046...a3d2266d`](https://wirefluidscan.com/tx/0xb17b3046f856ca36b815a7e2017988b1008cbe321bb6a17426897b83a3d2266d) |
| 46 | C3 Buy QG | [`0x3274a4d2...1b3906b1`](https://wirefluidscan.com/tx/0x3274a4d2119701eb7d88bb4cae27c3905fdc5978e9d2839e5780eb9f1b3906b1) |
| 47 | C3 Buy HK | [`0x9b47e3d0...57442814`](https://wirefluidscan.com/tx/0x9b47e3d0b9230b913a541e3666e9385be979d962615d957dfd57714a57442814) |
| 48 | C3 Buy RW | [`0xa9aac03b...d5d2f738`](https://wirefluidscan.com/tx/0xa9aac03bf8ad9dbcbfb79ec749422a53cd0fac2c61a4c34283bd4389d5d2f738) |
| 49 | C3 Appr IU | [`0x113f6613...463346a9`](https://wirefluidscan.com/tx/0x113f66136c25bdddad04d03f4fd766c61ac41e25f36ae71fba9c38a4463346a9) |
| 50 | C3 Sell IU | [`0xacd7ecbe...b51853e3`](https://wirefluidscan.com/tx/0xacd7ecbebd121a5f97ffce5cfd2fab4f06f33ff050da0ea96bdd64d0b51853e3) |
| 51 | C3 Appr LQ | [`0xb6894617...09b4e418`](https://wirefluidscan.com/tx/0xb689461784d7d2d4ce9140968427e5cb42a3ce42923206e5f05940dd09b4e418) |
| 52 | C3 Sell LQ | [`0xd3e3569d...1c8acd30`](https://wirefluidscan.com/tx/0xd3e3569dbb09482205a67825a4818c07a13ff4c9f0d5c00f095897531c8acd30) |
| 53 | C3 Appr MS | [`0xcb6bd3d0...ffca0ce0`](https://wirefluidscan.com/tx/0xcb6bd3d0c95dcf1d5dba0ce9c28dbd6f2f615dea8a8dfc09901f5f68ffca0ce0) |
| 54 | C3 Sell MS | [`0xb7dfa0e8...8875ad6c`](https://wirefluidscan.com/tx/0xb7dfa0e8dd172ebf80296f2a355ddca9c21176bb795c4c76c17271078875ad6c) |
| 55 | C3 Appr KK | [`0x81d45886...1e5c3373`](https://wirefluidscan.com/tx/0x81d45886d24fd14cf59ec5fda603ae44fef943bb1f3c8f9ded9b25141e5c3373) |
| 56 | C3 Sell KK | [`0x8965ecd1...4a33fb06`](https://wirefluidscan.com/tx/0x8965ecd19749ada5c45f921a8398683ff666d6d9596f3d82401a59264a33fb06) |
| 57 | C3 Appr PZ | [`0x5ff1ec08...c97d9ca4`](https://wirefluidscan.com/tx/0x5ff1ec08bb25fbd70b2464bdce320fc21d6c6f7ae9285423264feb90c97d9ca4) |
| 58 | C3 Sell PZ | [`0xb9e9aa38...75e1e4e9`](https://wirefluidscan.com/tx/0xb9e9aa38d039dc915816d952b416a8027c5a4e5a3ecc896eb51f86ca75e1e4e9) |
| 59 | C3 Appr QG | [`0x6bdbc105...b6bd953c`](https://wirefluidscan.com/tx/0x6bdbc1050b27afb0715ffb15943d6484b1c75f084c0d09251386f87eb6bd953c) |
| 60 | C3 Sell QG | [`0x96efa1d5...2c56563e`](https://wirefluidscan.com/tx/0x96efa1d50276a5a0f8de11bae79b78131323f06ecf64f3ee1994adae2c56563e) |
| 61 | C3 Appr HK | [`0x84a59544...add9b902`](https://wirefluidscan.com/tx/0x84a59544ec779657d3cb29d48d3d3e7d82be2d9c17067fd32fdeb25badd9b902) |
| 62 | C3 Sell HK | [`0x49f21b92...341956aa`](https://wirefluidscan.com/tx/0x49f21b924a1de4e5b8e68e21dd2b7a9e32682219d18dce1dbcf8dafc341956aa) |
| 63 | C3 Appr RW | [`0xc2f77d32...5d71e963`](https://wirefluidscan.com/tx/0xc2f77d320c29d6b0306fa2d6583b600a09d1227cf063cb4c1edfbfcc5d71e963) |
| 64 | C3 Sell RW | [`0x92330a52...053012f2`](https://wirefluidscan.com/tx/0x92330a52e5470bce1bba262815e7004fb4538e310ee4dfdf4c9065d7053012f2) |
| 65 | C4 Buy PZ | [`0x4a1249f6...070ce887`](https://wirefluidscan.com/tx/0x4a1249f634c059466b7d75cb93d284d18c27cf99a0cebc21d2615b4b070ce887) |
| 66 | C4 Buy QG | [`0xdaf79e04...53197f07`](https://wirefluidscan.com/tx/0xdaf79e042b48e54a6e8e56ec0434e1b8cf9bff8fd9f6c5707ba86cbc53197f07) |
| 67 | C4 Buy HK | [`0x38651b29...49ed1d94`](https://wirefluidscan.com/tx/0x38651b2978997bb8c48c8b789496ef312100f7aaf1f735053d06beb549ed1d94) |
| 68 | C4 Buy RW | [`0xaad327ec...17f49d31`](https://wirefluidscan.com/tx/0xaad327ecf565fb4e717f9af9dae324e0945c21bb4f9f97ac280f59cb17f49d31) |
| 69 | C4 Appr IU | [`0xbfedb675...82d0cffc`](https://wirefluidscan.com/tx/0xbfedb67590edc3da2c61a728c72fc6286f8a29a4d53c299f4c95dea682d0cffc) |
| 70 | C4 Appr LQ | [`0x6ba04877...84019256`](https://wirefluidscan.com/tx/0x6ba0487739443ea4b14aa212d53b0fa467ed4adedb7232778e2606b484019256) |
| 71 | C4 Appr MS | [`0x70d9a132...b67b5ba8`](https://wirefluidscan.com/tx/0x70d9a132f32e4b38c331adc5bba904dd53c43f6d984e9fad9cba9249b67b5ba8) |
| 72 | C4 Appr KK | [`0x2d5a2cf0...2c0ea107`](https://wirefluidscan.com/tx/0x2d5a2cf08f45b80cdad837cf4042888902696588e288eff03391079a2c0ea107) |
| 73 | C4 Appr PZ | [`0x004f0a38...55b96d4c`](https://wirefluidscan.com/tx/0x004f0a389a586d2f0b651b1a9e14e2c008a5815aaed96c7a353ea4c355b96d4c) |
| 74 | C4 Sell PZ | [`0x17b4081c...39cfc2ff`](https://wirefluidscan.com/tx/0x17b4081c4fc2bdac64ae502ba4d096089d4c80984aa6518c65bca30a39cfc2ff) |
| 75 | C4 Appr QG | [`0xc33ede3a...b0fcbc5c`](https://wirefluidscan.com/tx/0xc33ede3ada33ad624766d0a1b8bee836ce6d9701b58105afaeec3c4ab0fcbc5c) |
| 76 | C4 Sell QG | [`0x3444661e...68914cb0`](https://wirefluidscan.com/tx/0x3444661eb4caed0fefcd3cf96f6a2c8b7bcd6e7ee686e6ee8e0aef7b68914cb0) |
| 77 | C4 Appr HK | [`0x9ed34281...ed01e59e`](https://wirefluidscan.com/tx/0x9ed342815de3930b1342624091c2a416d5cfd113f44d78badb00f1e1ed01e59e) |
| 78 | C4 Sell HK | [`0x9a56e9ae...dbcbd1e7`](https://wirefluidscan.com/tx/0x9a56e9aec6ce43da81dd48eef1962d211564e9718ba74cb58c93a655dbcbd1e7) |
| 79 | C4 Appr RW | [`0xdf6a11f3...c0372f0a`](https://wirefluidscan.com/tx/0xdf6a11f3ffdce87c239509d4f38d7a43f32362453fe0ab63ad60294ec0372f0a) |
| 80 | C4 Sell RW | [`0x3ab6a2c1...ff6d81ff`](https://wirefluidscan.com/tx/0x3ab6a2c15ca285d8c778921d495da084eaf30c38f1937d6d9818bf8bff6d81ff) |
| 81 | C5 Buy IU | [`0xaa2c19d4...0ce94de8`](https://wirefluidscan.com/tx/0xaa2c19d4795c318a7e44374fb4eade7d3623211b6f33020dea89baa60ce94de8) |
| 82 | C5 Buy LQ | [`0xfb5d4e48...b7da5117`](https://wirefluidscan.com/tx/0xfb5d4e480507772eec16e8df11bdebec79fd6ca85b74487aa9030413b7da5117) |
| 83 | C5 Buy MS | [`0xa94a23e5...3af50095`](https://wirefluidscan.com/tx/0xa94a23e5c2a1d55fdddd9b17103affc570a478330e1ea45db80eaf7a3af50095) |
| 84 | C5 Buy KK | [`0x320c0140...9fb956dc`](https://wirefluidscan.com/tx/0x320c01405930a0307bac11fa29efc489e5111b96516dbe17402bf8ac9fb956dc) |
| 85 | C5 Buy PZ | [`0x763349c0...6d628320`](https://wirefluidscan.com/tx/0x763349c034b895571ad7dc649a675906be83046cfadff1880fccd4a76d628320) |
| 86 | C5 Buy QG | [`0xba33e501...bdfa875d`](https://wirefluidscan.com/tx/0xba33e501da58ec646f858f72d65aae6245f091ef017d4c515279306cbdfa875d) |
| 87 | C5 Buy HK | [`0xccf40ea4...40bdf9f9`](https://wirefluidscan.com/tx/0xccf40ea4de6d1d077a3cc55d3abc6e6e5e1dd142ab516ff61e10731440bdf9f9) |
| 88 | C5 Buy RW | [`0x679a585e...55820ec1`](https://wirefluidscan.com/tx/0x679a585e75503ca12a9cb8c1e4e9f9f0071f610205e289eaaea5eec055820ec1) |
| 89 | C5 Appr IU | [`0x94368601...f6adcaa7`](https://wirefluidscan.com/tx/0x94368601270edb7070bfb8f9c0be0514bb484d5d0c5fb559db9ff6abf6adcaa7) |
| 90 | C5 Sell IU | [`0x88067aa5...93c19588`](https://wirefluidscan.com/tx/0x88067aa5b0eed50903be952922d4eb6f48c46018173fa911b67a77e893c19588) |
| 91 | C5 Appr LQ | [`0x8bc47c31...d99f5f49`](https://wirefluidscan.com/tx/0x8bc47c315512b7c8e43fe250cd1616c9646131138fc3b3e065c14fb1d99f5f49) |
| 92 | C5 Sell LQ | [`0x4449c2a1...ce207651`](https://wirefluidscan.com/tx/0x4449c2a16478f9e69cd9a9e758429d2208464d4f82f1024d7e5c2d37ce207651) |
| 93 | C5 Appr MS | [`0x0d7c88d8...8847b36c`](https://wirefluidscan.com/tx/0x0d7c88d8e5f674c71fea8fbf2f2888236d1738c0e850d66e6b0fe6708847b36c) |
| 94 | C5 Sell MS | [`0x31fc5d56...3f341571`](https://wirefluidscan.com/tx/0x31fc5d56a8c7f0b9cc6c91ce0442076e23815e7e1a73c2f1a8d9779a3f341571) |
| 95 | C5 Appr KK | [`0xdd31d359...ce27ba29`](https://wirefluidscan.com/tx/0xdd31d3599bdbce657567eb564e12182d637fe776dab434881dddc2f2ce27ba29) |
| 96 | C5 Sell KK | [`0x1c66cd04...cb37675d`](https://wirefluidscan.com/tx/0x1c66cd04c375b6ba4307972e47946202f0d6399825d99f36b4d60df2cb37675d) |
| 97 | C5 Appr PZ | [`0x31f7f799...030b1308`](https://wirefluidscan.com/tx/0x31f7f79966f33e1d342d642425c2933cb68dba5db25276b554a13c9b030b1308) |
| 98 | C5 Sell PZ | [`0xbabf6346...833d069b`](https://wirefluidscan.com/tx/0xbabf63464e96f3ad353e25ced1320a845a35a40e5752ca4862905c53833d069b) |
| 99 | C5 Appr QG | [`0x3ce45ad2...a396b1b4`](https://wirefluidscan.com/tx/0x3ce45ad28aa6ecb496d8e16baf69ed27bf369db6311e07397ffe3906a396b1b4) |
| 100 | C5 Sell QG | [`0x000ae53e...62bb4041`](https://wirefluidscan.com/tx/0x000ae53e51de4dcf7c4bd6db8b396bddd69fc6c31e67bd3fa8dce73b62bb4041) |
| 101 | C5 Appr HK | [`0x7c10732e...5256ffd0`](https://wirefluidscan.com/tx/0x7c10732e6ef3fad00ab5fba3a70365e4b9cca59315703f360d4555675256ffd0) |
| 102 | C5 Sell HK | [`0xc4faa7f8...66427366`](https://wirefluidscan.com/tx/0xc4faa7f8f71f25ef9be8a2edc64152eb4f8cbd6de11697c58482435766427366) |
| 103 | C5 Appr RW | [`0xd664dac6...62277f44`](https://wirefluidscan.com/tx/0xd664dac663e5f51b9077072789d4d1d2b90340062582e581f687854c62277f44) |
| 104 | C5 Sell RW | [`0x29830619...276bdbd2`](https://wirefluidscan.com/tx/0x2983061937088b9be492edc6ec9f63623fa67e0c1f3b30fc84a6a0f2276bdbd2) |
| 105 | C6 Buy PZ | [`0x216461da...70f1fe00`](https://wirefluidscan.com/tx/0x216461da83dc13dd12e38e2ffea0b93084e30da5a1cf7a3c99e482fe70f1fe00) |
| 106 | C6 Buy QG | [`0xe74604a8...45bd7401`](https://wirefluidscan.com/tx/0xe74604a81ad0a6e47461a1f4137e2bdf61a901c698b032a81117707945bd7401) |
| 107 | C6 Buy HK | [`0x4552e1c7...89e09509`](https://wirefluidscan.com/tx/0x4552e1c7387071d4b3e7a863fe33183e258cf15a861862f42fc2d26789e09509) |
| 108 | C6 Buy RW | [`0xfa954729...2f2b3f9e`](https://wirefluidscan.com/tx/0xfa95472917a66e2bba309acf1eaaaae2e2d33b38275cfa030f31b4962f2b3f9e) |
| 109 | C6 Appr IU | [`0x14e3cef3...63d8c20d`](https://wirefluidscan.com/tx/0x14e3cef357f0562ec040503d31f7e1897db8ce6ab238a84dc6181e2263d8c20d) |
| 110 | C6 Appr LQ | [`0x5a9bff8a...4d86cef6`](https://wirefluidscan.com/tx/0x5a9bff8abdafb3c355a330d1bcae2db25d16d776dc859e0bebf0f37a4d86cef6) |
| 111 | C6 Appr MS | [`0xc72b3e8e...0f2452ac`](https://wirefluidscan.com/tx/0xc72b3e8edb46a7c625cfc84a85b9c7e7ef0ff795d48b3c4e59e386410f2452ac) |
| 112 | C6 Appr KK | [`0x0193da98...24b55cf8`](https://wirefluidscan.com/tx/0x0193da98d88f538ac0f5f0ecaf88056492b1331468c0801d90adf1d124b55cf8) |
| 113 | C6 Appr PZ | [`0xc46fb093...e68e2169`](https://wirefluidscan.com/tx/0xc46fb093bd6b05be36f24fdbd7141b8142025523b9fdbd40c4f6a3b5e68e2169) |
| 114 | C6 Sell PZ | [`0xcd609eb6...9ba4fcf8`](https://wirefluidscan.com/tx/0xcd609eb6d35437a0120ff06bd41fc17ff10ca2350e41431647a8ba329ba4fcf8) |
| 115 | C6 Appr QG | [`0x168396c7...ff593bee`](https://wirefluidscan.com/tx/0x168396c745e5810b0986396ec1fb512a9db9f522410493258728db58ff593bee) |
| 116 | C6 Sell QG | [`0xfd41eb3f...86b3d3d8`](https://wirefluidscan.com/tx/0xfd41eb3fe2ac9106b34eadefaff6ffed73fbe15b28b9418c9d822ff986b3d3d8) |
| 117 | C6 Appr HK | [`0xef7fed3c...ce19d5bd`](https://wirefluidscan.com/tx/0xef7fed3cec3755eced37fd05d0561c29ab36f0ce0d47922a465ce67ece19d5bd) |
| 118 | C6 Sell HK | [`0x3aa997be...ddcefa7e`](https://wirefluidscan.com/tx/0x3aa997bef94dde83784c1f5ec3af7001f3ee736da94ddc8ee7a515d0ddcefa7e) |
| 119 | C6 Appr RW | [`0x18f43bab...9f77c2aa`](https://wirefluidscan.com/tx/0x18f43babcb2b1b5583ac56348ff3e9da8d026a2b718aedeaf2f5c8de9f77c2aa) |
| 120 | C6 Sell RW | [`0xce050a1a...da51d7c2`](https://wirefluidscan.com/tx/0xce050a1af76c50ecab4483ba40ede562b923a326f5ceca1bb301225eda51d7c2) |
| 121 | C7 Buy IU | [`0xba2108e5...1fd999ae`](https://wirefluidscan.com/tx/0xba2108e5a9dfbaea3c5addca5292f7c843d23f8ee45b1b871c8851cf1fd999ae) |
| 122 | C7 Buy PZ | [`0x4d269cab...5abd3950`](https://wirefluidscan.com/tx/0x4d269cabe213eec13ffebd85e7061cbb186d369aa540ae97b43d3d1c5abd3950) |
| 123 | C7 Buy QG | [`0x76c30b8a...e72d317b`](https://wirefluidscan.com/tx/0x76c30b8a9aae5eb0e8f3b050932f4084da1c071329cc1fad387b7eb8e72d317b) |
| 124 | C7 Buy HK | [`0x0101dad3...d05dd5ce`](https://wirefluidscan.com/tx/0x0101dad3492884b9bc957b88cbebcfeb4f9bf28a79368a9546fd17c1d05dd5ce) |
| 125 | C7 Buy RW | [`0x063c41cc...2ead6532`](https://wirefluidscan.com/tx/0x063c41cc34308ba8fd36e6507c14574199f7ecc2678ba2c2f124362a2ead6532) |
| 126 | C7 Appr IU | [`0x29ea6b9c...48923297`](https://wirefluidscan.com/tx/0x29ea6b9c43996899a8649e7df2826b20a655c00f6cc55a21bd61648d48923297) |
| 127 | C7 Sell IU | [`0x8739784e...06f916f3`](https://wirefluidscan.com/tx/0x8739784ebfaa58ccce6f8af5e2c9bbdbeb4c027d6ea5c15a6e38a72b06f916f3) |
| 128 | C7 Appr LQ | [`0x48623d5f...0faf08f3`](https://wirefluidscan.com/tx/0x48623d5fdfbba0c5345f615a2fd12a7100ccb76a3fd0f0aa496df6510faf08f3) |
| 129 | C7 Appr MS | [`0x8a849cb2...17ca433d`](https://wirefluidscan.com/tx/0x8a849cb220bb7242f0a443253e907dfb37072ad7a11e898312e0bc7817ca433d) |
| 130 | C7 Appr KK | [`0x2b663538...771a04b2`](https://wirefluidscan.com/tx/0x2b66353838247f97594d4a7cd20f632f353e187cc2b142e358d9064d771a04b2) |
| 131 | C7 Appr PZ | [`0xd9677f5d...a6a6077d`](https://wirefluidscan.com/tx/0xd9677f5d5bd5b2a455b60b63b988cb76d39c40e28292f6e880af0846a6a6077d) |
| 132 | C7 Sell PZ | [`0x5b763e45...37693c60`](https://wirefluidscan.com/tx/0x5b763e455033ce9fa322368c476a92b2a5cf37816681dcf9102b2acc37693c60) |
| 133 | C7 Appr QG | [`0xfbcd4f81...6cf9b8cd`](https://wirefluidscan.com/tx/0xfbcd4f81b049580379ef10ce99eb3afa3b7ef520775ff9c34fc0abc76cf9b8cd) |
| 134 | C7 Sell QG | [`0x17628faf...64e958bc`](https://wirefluidscan.com/tx/0x17628faf473a5f92b99fd5b7b1f3ea94f9cc22d6c165c20080ba94f964e958bc) |
| 135 | C7 Appr HK | [`0xbd14b89c...1ef81a3e`](https://wirefluidscan.com/tx/0xbd14b89c470954372de4bb4f59f6393c97ad1ca0bd4fdbc6b21b70c41ef81a3e) |
| 136 | C7 Sell HK | [`0x2f68d777...880511bf`](https://wirefluidscan.com/tx/0x2f68d777be61725c85802b44ed34e979329820e5d83282e139ad1a90880511bf) |
| 137 | C7 Appr RW | [`0xc64bed7e...95310f3c`](https://wirefluidscan.com/tx/0xc64bed7e1de937efec0e0b0cdeab8c21bbf3d3a2edb9b74f35db2f0395310f3c) |
| 138 | C7 Sell RW | [`0xad6ab553...226d9d03`](https://wirefluidscan.com/tx/0xad6ab553f065ec0fecc541c4a1bf50e08f7cb693b92bff449bd676b1226d9d03) |
| 139 | C8 Buy PZ | [`0x7ef7f710...1fb533f9`](https://wirefluidscan.com/tx/0x7ef7f71036a14d7dbac498ac03e8e5bf415e98dfbd36c780896b56171fb533f9) |
| 140 | C8 Buy QG | [`0x51dbb2f0...8395d944`](https://wirefluidscan.com/tx/0x51dbb2f0e6322982863ed715bf592c5ae21232f476e54c78705b63b78395d944) |
| 141 | C8 Buy HK | [`0x3fa150c1...67472787`](https://wirefluidscan.com/tx/0x3fa150c15ad435f83a327982d9e9407a6b44d2da4bcd7490a1c27d4867472787) |
| 142 | C8 Buy RW | [`0x90dd7161...6e8d7c86`](https://wirefluidscan.com/tx/0x90dd71615b969265b70a4bff06e37f87c85ed2d60985b619b2fdea086e8d7c86) |
| 143 | C8 Appr IU | [`0xf23f40ac...7a5420dc`](https://wirefluidscan.com/tx/0xf23f40ac110c07d662a592131284f223a7b97a832c13d4c5be9a74337a5420dc) |
| 144 | C8 Appr LQ | [`0xf6fefa99...5ba6c04e`](https://wirefluidscan.com/tx/0xf6fefa997cf2643c3c79883e7839cad4db91db49e3b0299b4c1d83065ba6c04e) |
| 145 | C8 Appr MS | [`0xf6e68745...05c1167f`](https://wirefluidscan.com/tx/0xf6e6874515694f71511aa655f70920cd8e3eeb1746a099e683c7b61905c1167f) |
| 146 | C8 Appr KK | [`0x93061d7f...54a3eaa2`](https://wirefluidscan.com/tx/0x93061d7f4e2309cfceb39e4da192092f52141393baa4f35a92c3055154a3eaa2) |
| 147 | C8 Appr PZ | [`0x350a1a32...145e2c0c`](https://wirefluidscan.com/tx/0x350a1a32dba134ea4a90ec2534cb5fab1664b4d2f671275df1e9487d145e2c0c) |
| 148 | C8 Sell PZ | [`0x8f3f3d79...7ec20db1`](https://wirefluidscan.com/tx/0x8f3f3d7939415df9aef7a6415117e2d893dad0600cdee3eb59fa772f7ec20db1) |
| 149 | C8 Appr QG | [`0xbaf7e1aa...cb87328e`](https://wirefluidscan.com/tx/0xbaf7e1aaf0f9d155f2874065bad83f1ce119fb726b3c534ee04c2d48cb87328e) |
| 150 | C8 Sell QG | [`0x03687c87...70c927ef`](https://wirefluidscan.com/tx/0x03687c87a416653f93458c2b989ce2907298fb60ff0bbf1b4310dd0e70c927ef) |
| 151 | C8 Appr HK | [`0x55e6c63d...9608fbec`](https://wirefluidscan.com/tx/0x55e6c63d40c001b1a08091f11a06cc5668dddb6d4c1121c228cc57019608fbec) |
| 152 | C8 Sell HK | [`0x78bda56f...aacc1f79`](https://wirefluidscan.com/tx/0x78bda56f9fa698d34e369b9254034494468f0b152ef81b1055b485f4aacc1f79) |
| 153 | C8 Appr RW | [`0x3081e761...826b3e8b`](https://wirefluidscan.com/tx/0x3081e761e2a1ca145db0cc921d4db521ae2a1d23923f93e59e377cf3826b3e8b) |
| 154 | C8 Sell RW | [`0xf6dfe6cc...dc7e07f4`](https://wirefluidscan.com/tx/0xf6dfe6cc3f2dd8b685386d7c869e849e1a885e00d5dd923adf3a76bddc7e07f4) |
| 155 | C9 Buy IU | [`0x4fb9eb93...40df9945`](https://wirefluidscan.com/tx/0x4fb9eb936732764e68c5fd53f82bb0d92ec888f926147a008cea542b40df9945) |
| 156 | C9 Buy PZ | [`0x491b8fc9...87b4ffa7`](https://wirefluidscan.com/tx/0x491b8fc9de3233d084f0f835c46d3e1a986e9ada0da6dcb37c89d9be87b4ffa7) |
| 157 | C9 Buy QG | [`0x79987a24...4813ddcf`](https://wirefluidscan.com/tx/0x79987a24066f7e314709e0c1169a7670987927f7dc8fac1596bcef544813ddcf) |
| 158 | C9 Buy HK | [`0x17e18593...8b2f8e7c`](https://wirefluidscan.com/tx/0x17e1859351d6b4540c5f174b594e45c0b3a9abedc9134e072f629f428b2f8e7c) |
| 159 | C9 Buy RW | [`0xbf7b2c38...2e813405`](https://wirefluidscan.com/tx/0xbf7b2c38f9470ee7716e37d6ae0412453b76b062b5f67559d36ae5aa2e813405) |
| 160 | C9 Appr IU | [`0xb4ba591c...50e7fc38`](https://wirefluidscan.com/tx/0xb4ba591c4d31e31561276575102c8ae98a5aa1aed3d8dbc718b6a5f650e7fc38) |
| 161 | C9 Sell IU | [`0x119991f2...995a80b4`](https://wirefluidscan.com/tx/0x119991f27cfe35b8a62281f5b8081ee7c6a3f0f2a102a4c6777243b0995a80b4) |
| 162 | C9 Appr LQ | [`0xb244aa3c...fa785cbe`](https://wirefluidscan.com/tx/0xb244aa3c92bf2d292074620028a4ead5d49e855309afb970b054a73ffa785cbe) |
| 163 | C9 Appr MS | [`0xe4f0d2dc...7eeaf721`](https://wirefluidscan.com/tx/0xe4f0d2dcc9d4c2545e718d5ec62d38297783e904f8a635aa04d9dda97eeaf721) |
| 164 | C9 Appr KK | [`0x10bb9e7f...3ea1f26c`](https://wirefluidscan.com/tx/0x10bb9e7fdcb4e2237c44f2d351da0ac422e8ada2e6d700d1e841ad0c3ea1f26c) |
| 165 | C9 Appr PZ | [`0x3df83e08...c93c3d3d`](https://wirefluidscan.com/tx/0x3df83e08e310f277401d501c3fd3b06dc8c02d034b1c509b71c37b21c93c3d3d) |
| 166 | C9 Sell PZ | [`0x119ffd84...dbf880d4`](https://wirefluidscan.com/tx/0x119ffd844742cb2516a2bc7ef719596cacdc3d423f9ef4460bf64babdbf880d4) |
| 167 | C9 Appr QG | [`0x82e32188...14b175b1`](https://wirefluidscan.com/tx/0x82e32188db84289e026f562d120d431a39ae554a74793ef9fca3b43014b175b1) |
| 168 | C9 Sell QG | [`0xcc41bf16...b2008a1b`](https://wirefluidscan.com/tx/0xcc41bf16df275ad2beba732d99d1655cf4530eada82f4697fe60caddb2008a1b) |
| 169 | C9 Appr HK | [`0x9be51a0c...e098ee0a`](https://wirefluidscan.com/tx/0x9be51a0c3a3a1808c0568b853ac1a2f96b801b238105c84992246708e098ee0a) |
| 170 | C9 Sell HK | [`0xb09cafd3...e7461395`](https://wirefluidscan.com/tx/0xb09cafd3f19ef368490c6465198dc7105d9fc5b3559bdd8b9c234c8ae7461395) |
| 171 | C9 Appr RW | [`0x07271aad...46571667`](https://wirefluidscan.com/tx/0x07271aad6e1e1d164fbd4887323ecd7f750e5cc3f39a9d6ce09da08346571667) |
| 172 | C9 Sell RW | [`0x8a32d798...8806787f`](https://wirefluidscan.com/tx/0x8a32d798f8042b0b6adf37debaec5b27ab78bd9ed270e1d76efefa5b8806787f) |
| 173 | C10 Buy LQ | [`0x4e500514...022eb1c3`](https://wirefluidscan.com/tx/0x4e5005149f9184a185a0d0db43fc1acbbe187a7facd25a083472c634022eb1c3) |
| 174 | C10 Buy MS | [`0x0c1ac3fe...eb9c8a49`](https://wirefluidscan.com/tx/0x0c1ac3feef660a50319235a14dd54dc2a1f4307e076c58be24bb83d6eb9c8a49) |
| 175 | C10 Buy KK | [`0xf210e10c...569ac5a8`](https://wirefluidscan.com/tx/0xf210e10cae01f53b5a5eb7f58fe894c81f4b88fef71fb1c96c746013569ac5a8) |
| 176 | C10 Buy PZ | [`0xc7381f32...f1cf01dc`](https://wirefluidscan.com/tx/0xc7381f32a2204f6b7e461fb9ccc51a026f19f667b5d7d5d143b9ea1af1cf01dc) |
| 177 | C10 Buy QG | [`0x7ef80dc4...c01e44b3`](https://wirefluidscan.com/tx/0x7ef80dc43d5cf11b920c8603555841485299d237d5e3fd04a1f8dc6ac01e44b3) |
| 178 | C10 Buy HK | [`0x24477552...1a2f51d1`](https://wirefluidscan.com/tx/0x2447755200f84ac0338449f095fec56676ed71d46e29b0f0fb46f18e1a2f51d1) |
| 179 | C10 Buy RW | [`0x94839188...074cc8cb`](https://wirefluidscan.com/tx/0x9483918817f4df76caf608ec1357dbaad028832a189427591938cb3f074cc8cb) |
| 180 | C10 Appr IU | [`0xf2e1ee58...99997b26`](https://wirefluidscan.com/tx/0xf2e1ee5801d2a5a4882bc5ec76767d05005dd6344fa94c3b03b1354d99997b26) |
| 181 | C10 Appr LQ | [`0x14a7d0a3...26e382e0`](https://wirefluidscan.com/tx/0x14a7d0a3796ca86a328aa1eb042caea15ee1a6f1b40848f41284843b26e382e0) |
| 182 | C10 Sell LQ | [`0x5452f11b...87ef7d31`](https://wirefluidscan.com/tx/0x5452f11b218cbf6bf5d2e9046fca82a1d82090213e86c8a8ceb362f187ef7d31) |
| 183 | C10 Appr MS | [`0x8ca0e030...8436ef79`](https://wirefluidscan.com/tx/0x8ca0e030a6e4952c1486c9f6d8fecf9e1c0d22bcd9de355048bc10508436ef79) |
| 184 | C10 Sell MS | [`0xf35f9c84...4390e4fc`](https://wirefluidscan.com/tx/0xf35f9c84b9420e54791b49ca5c037f9e5b839a7234b24ee421d5eee34390e4fc) |
| 185 | C10 Appr KK | [`0x5a16a01f...85bc683d`](https://wirefluidscan.com/tx/0x5a16a01feac65169f5f20c81c4b43f22b6f7d518ee5e2c2db5e833ec85bc683d) |
| 186 | C10 Sell KK | [`0x2a2deeba...3bab7138`](https://wirefluidscan.com/tx/0x2a2deebafd2573e8910136a6ffd5d33df129ef516b471c4ee45baa5b3bab7138) |
| 187 | C10 Appr PZ | [`0x247ef0f1...72e9b214`](https://wirefluidscan.com/tx/0x247ef0f1a634bfb1beaefb2249228758483f7b743bc411f2255351b572e9b214) |
| 188 | C10 Sell PZ | [`0x9ac0bbf5...7127493a`](https://wirefluidscan.com/tx/0x9ac0bbf5cf46a19b39b1166b64b626127c2182876e92df7136ec88e17127493a) |
| 189 | C10 Appr QG | [`0xf4cf24e9...bdbd2289`](https://wirefluidscan.com/tx/0xf4cf24e9fcd7b66e0cb61d6ac212a1a7a804cf1fd50c7fdaff2df825bdbd2289) |
| 190 | C10 Sell QG | [`0x708cebe7...5f102746`](https://wirefluidscan.com/tx/0x708cebe73b1a4670a73e029b7f6114641137494755bd124b9cae7dcd5f102746) |
| 191 | C10 Appr HK | [`0x99a7f91f...3f799a9b`](https://wirefluidscan.com/tx/0x99a7f91f2df5fc1394c0be21d1c54bc704bb3b7049fd4bb21206998d3f799a9b) |
| 192 | C10 Sell HK | [`0xbc25f5f7...55fc0229`](https://wirefluidscan.com/tx/0xbc25f5f7d3acd3e3a00228e5a6d9ba716acaf59d62f54ed3e32dd45555fc0229) |
| 193 | C10 Appr RW | [`0x1a0077d6...53c68030`](https://wirefluidscan.com/tx/0x1a0077d66723248961484edc1d44baee8b70cbedab961652a2f78d3b53c68030) |
| 194 | C10 Sell RW | [`0xf5297b3c...727514c6`](https://wirefluidscan.com/tx/0xf5297b3c960c52c8adeaf1e6ea70388631f8767331eef36136f0e325727514c6) |
| 195 | C11 Buy IU | [`0xf0bc65f1...34f314a0`](https://wirefluidscan.com/tx/0xf0bc65f187651c02237bfac1f256cf6e4f1c937d8d8cd76d20a9fff034f314a0) |
| 196 | C11 Buy LQ | [`0x4d4e83c3...e6a9578b`](https://wirefluidscan.com/tx/0x4d4e83c383e4ae7598a969a09fa64b530bc3524d3dd6c86aff75c385e6a9578b) |
| 197 | C11 Buy MS | [`0xab9b67d7...93f9d486`](https://wirefluidscan.com/tx/0xab9b67d79b227eb0903df41a0d1b96eccb2059b77caa65cfaf35c55193f9d486) |
| 198 | C11 Buy KK | [`0x2edd4cca...a3876cbc`](https://wirefluidscan.com/tx/0x2edd4ccafac38aa178c15e3d286b7be364b495c7435593f457d091daa3876cbc) |
| 199 | C11 Buy PZ | [`0x76351406...67874485`](https://wirefluidscan.com/tx/0x763514066c9e2fe73a35d8db25c88880100029034ed9de6b444bd0e967874485) |
| 200 | C11 Buy QG | [`0x62ab173d...f165cf57`](https://wirefluidscan.com/tx/0x62ab173dd51582e01c06beebdb1ffb11865f856bb6dfa0c7f39ab74af165cf57) |
| 201 | C11 Buy HK | [`0xf18b3116...7a0b2898`](https://wirefluidscan.com/tx/0xf18b3116d584e42ecadb4994f906739aced19a4e439714db21da348e7a0b2898) |
| 202 | C11 Buy RW | [`0x91a5e02e...1744368c`](https://wirefluidscan.com/tx/0x91a5e02e6cfb84a49b9bbdd39a9a0fa08b6fb560a30da389354b4dff1744368c) |
| 203 | C11 Appr IU | [`0x6f9a0f54...2d7c4d7d`](https://wirefluidscan.com/tx/0x6f9a0f5457aae1ff94fd042fe34b1e16e2c20597ac59d9db5e069cec2d7c4d7d) |
| 204 | C11 Sell IU | [`0xffa4556f...8806ebc8`](https://wirefluidscan.com/tx/0xffa4556fbd1c30bb0c8b04a38e1f86711477775c5851bdab4cd7213e8806ebc8) |
| 205 | C11 Appr LQ | [`0xd119f3a3...4c6cea2a`](https://wirefluidscan.com/tx/0xd119f3a3ccf44c1a72bb274736cc4e071adbe10091a65c489275c6c54c6cea2a) |
| 206 | C11 Sell LQ | [`0x6712066d...bc5ce607`](https://wirefluidscan.com/tx/0x6712066d39dd4408418eb820a1489b906cf58999c701014e2a140e9fbc5ce607) |
| 207 | C11 Appr MS | [`0x5a1067dd...cb58a7d8`](https://wirefluidscan.com/tx/0x5a1067dd6482b6dead53212a48be8b2a6f2a248b320c917305bb6c76cb58a7d8) |
| 208 | C11 Sell MS | [`0xc2b4da36...cfda4bab`](https://wirefluidscan.com/tx/0xc2b4da36925beb9ebac49f37fac9c7ac12f1b300f4857bf49e2dd9f0cfda4bab) |
| 209 | C11 Appr KK | [`0x25ee5945...b88b7ef9`](https://wirefluidscan.com/tx/0x25ee59451c36f1ad8f366e8aecc12575a54e31374ef0cfc5d990bb76b88b7ef9) |
| 210 | C11 Sell KK | [`0xfc7fedc9...75f8b9fe`](https://wirefluidscan.com/tx/0xfc7fedc9beeffff5d980e6afedfc9c411df1aafd320c9569cf008a7575f8b9fe) |
| 211 | C11 Appr PZ | [`0x72db707c...a440ad85`](https://wirefluidscan.com/tx/0x72db707c93b4dca48aa154392b8e7cb4543002e6ccfd20343317bdaba440ad85) |
| 212 | C11 Sell PZ | [`0x0fa738b6...5b167966`](https://wirefluidscan.com/tx/0x0fa738b6c4040bf29552635b4037a041062d0fcba67bb6d737d7a4d05b167966) |
| 213 | C11 Appr QG | [`0xca791151...33fe95c2`](https://wirefluidscan.com/tx/0xca791151508bbc179eeefb2d7ec2c30baed3cff0c6140cc1e423780433fe95c2) |
| 214 | C11 Sell QG | [`0x3ba48072...eee936a6`](https://wirefluidscan.com/tx/0x3ba480729fc44b10473883d1488c29af8dbe5fc84bd79e70fc05fb27eee936a6) |
| 215 | C11 Appr HK | [`0x627a56f4...ec1920ed`](https://wirefluidscan.com/tx/0x627a56f460c0f09a24aad9ea372bbb96c8cbc66e4b80a6feb4e4b6d1ec1920ed) |
| 216 | C11 Sell HK | [`0xfc85d59e...7fb6c516`](https://wirefluidscan.com/tx/0xfc85d59e4d589a27a3e4f2f9e6e91c05e0374993af5825633cc4675a7fb6c516) |
| 217 | C11 Appr RW | [`0x109e25b1...38428401`](https://wirefluidscan.com/tx/0x109e25b146eede83f970fe5e5decab78a257e05e7ac801cbea9baa6e38428401) |
| 218 | C11 Sell RW | [`0xcb7cc06b...bde63f5a`](https://wirefluidscan.com/tx/0xcb7cc06b83246aa06137e4a56a0f71b81edbf1d6520f3f4178317fadbde63f5a) |
| 219 | C12 Buy LQ | [`0xe8d09fe0...c74c52c7`](https://wirefluidscan.com/tx/0xe8d09fe0a80d5abdb6a2f393bd470cacface672276da80478f9edbf1c74c52c7) |
| 220 | C12 Buy MS | [`0x100e6f42...81152c81`](https://wirefluidscan.com/tx/0x100e6f427f6ebf9555efde46291c5597a146c8dc667f7d2b1a0cc8e281152c81) |
| 221 | C12 Buy KK | [`0xe6ec630f...1d8e6cd2`](https://wirefluidscan.com/tx/0xe6ec630f5b9926888aecc0c2a835e1c8ba912b36ba176d7fd7e732221d8e6cd2) |
| 222 | C12 Buy PZ | [`0xc7b280c8...236d63b5`](https://wirefluidscan.com/tx/0xc7b280c8e06b7ad77d9e13fb1c299ca12b93331b1f6408c740702ac1236d63b5) |
| 223 | C12 Buy QG | [`0x1477c9d1...805bd5d8`](https://wirefluidscan.com/tx/0x1477c9d13f9c02130ac3f135f18b76312a8a1169a521bb2d78b928f4805bd5d8) |
| 224 | C12 Buy HK | [`0xfe3ed7f1...00e47733`](https://wirefluidscan.com/tx/0xfe3ed7f1e9221d319ce01192609c65477fc22452825eb0dc7794098800e47733) |
| 225 | C12 Buy RW | [`0xafbc08d7...228a4d10`](https://wirefluidscan.com/tx/0xafbc08d79eaee9daddbdb7be13e0251464d82f760b4c1065efd83dfd228a4d10) |
| 226 | C12 Appr IU | [`0x76a6d03a...957f25de`](https://wirefluidscan.com/tx/0x76a6d03a0cde1aca541efc163c2a9f9af43449a5a4bb8faaa4907313957f25de) |
| 227 | C12 Appr LQ | [`0xc90410c7...2cab8c27`](https://wirefluidscan.com/tx/0xc90410c7b552a9846dfc0aef30e43e36c1a431957ef68f2b0bbbcde82cab8c27) |
| 228 | C12 Sell LQ | [`0x3cf772f3...8e59e61a`](https://wirefluidscan.com/tx/0x3cf772f38b07d6130e64e364d17ae7890fb98ab1bceaa594bfa114538e59e61a) |
| 229 | C12 Appr MS | [`0x11ae0462...a3f5991b`](https://wirefluidscan.com/tx/0x11ae046289349b5689fedc25afb80c725d3ca77b5000829914fee8b1a3f5991b) |
| 230 | C12 Sell MS | [`0xf153f500...454689d7`](https://wirefluidscan.com/tx/0xf153f50077880f7da1a82d065252f3587718e47da670d37fbf5fd5dc454689d7) |
| 231 | C12 Appr KK | [`0xb00f5ded...ac8864af`](https://wirefluidscan.com/tx/0xb00f5deded4a473cd623985cce9caa9e21fa63d9bceaf7de2f54f2ebac8864af) |
| 232 | C12 Sell KK | [`0x79ab4ac1...33a64f7b`](https://wirefluidscan.com/tx/0x79ab4ac18235a35535e72f0f1d33f483400c533547df63b8728bf97633a64f7b) |
| 233 | C12 Appr PZ | [`0x1ed910be...b80c3f46`](https://wirefluidscan.com/tx/0x1ed910be7424a01350cd71a88607674944b6449659e3c3ab30c1ca8bb80c3f46) |
| 234 | C12 Sell PZ | [`0xf6677794...d1635e8e`](https://wirefluidscan.com/tx/0xf66777947f64ce202d14b1a628e436e21368becf021830a57a294674d1635e8e) |
| 235 | C12 Appr QG | [`0x4b189faf...833ed4d0`](https://wirefluidscan.com/tx/0x4b189fafb98991be158afd494372de794ab803c6de4917bb437d237e833ed4d0) |
| 236 | C12 Sell QG | [`0xf5d00a59...012cfca6`](https://wirefluidscan.com/tx/0xf5d00a594538743741029b3ccf5f0e04f3d7184e4de06d7c14a91d2c012cfca6) |
| 237 | C12 Appr HK | [`0x455286f4...b7a195fc`](https://wirefluidscan.com/tx/0x455286f4d325a17bf5115733d60d758645a88be0def9d4e4d5cd1261b7a195fc) |
| 238 | C12 Sell HK | [`0xd80b9547...ad2ebb32`](https://wirefluidscan.com/tx/0xd80b9547d832c2503e000b8d7d584abda969f4c2125ccb347a5b47a8ad2ebb32) |
| 239 | C12 Appr RW | [`0x4c200e87...e2e2d7e6`](https://wirefluidscan.com/tx/0x4c200e8785de3d4bde9b468015fae91acb9f6ad102c2bf5d4afa0596e2e2d7e6) |
| 240 | C12 Sell RW | [`0x03fe55c1...3ac6cf26`](https://wirefluidscan.com/tx/0x03fe55c1b9444ab88477440d5e946d2fa92f6d9e45031018590158783ac6cf26) |
| 241 | C13 Buy IU | [`0x3388e159...8957711b`](https://wirefluidscan.com/tx/0x3388e15913ce0388f3cf19e0a882ed8d053ccb1c86f044f945206bd78957711b) |
| 242 | C13 Buy LQ | [`0x1fa820d4...56f57a2d`](https://wirefluidscan.com/tx/0x1fa820d4ecdc1f2da9dbdc971e7b6ea983baea64dcd83c90d329dc3556f57a2d) |
| 243 | C13 Buy MS | [`0xb04af1b7...d0958d72`](https://wirefluidscan.com/tx/0xb04af1b7de3cdc278dd2a2b60f71e7ae692ca05e0f27b0340ef890ecd0958d72) |
| 244 | C13 Buy KK | [`0xebcfeb73...6b714f77`](https://wirefluidscan.com/tx/0xebcfeb737ef650d1036f8cb0121fbbfd7ae5ef4f178e7c9d3f304de66b714f77) |
| 245 | C13 Buy PZ | [`0x287e675b...10db3967`](https://wirefluidscan.com/tx/0x287e675b3d721dbee7492abfa83986094c000ed4e562f00d87dc9b1810db3967) |
| 246 | C13 Buy QG | [`0xd5ce6944...43cecf9f`](https://wirefluidscan.com/tx/0xd5ce6944b17fb1b71c62c1b7902abbc01bc17efb7fb048054dce9bee43cecf9f) |
| 247 | C13 Buy HK | [`0x4bc1cc0d...55b5855d`](https://wirefluidscan.com/tx/0x4bc1cc0db5d8a8fa8c731eccb3560f74381c94de5d7855f09966d54255b5855d) |
| 248 | C13 Buy RW | [`0x2b1d45d7...fe2ac424`](https://wirefluidscan.com/tx/0x2b1d45d7af4fef7ea20d5a699d190fea1a63aaa89f4949d2f59ea95dfe2ac424) |
| 249 | C13 Appr IU | [`0x53095ba8...439578a4`](https://wirefluidscan.com/tx/0x53095ba88062f7c8313e8553ca1ef4d6525d8defa5e5522e4ce941ed439578a4) |
| 250 | C13 Sell IU | [`0x147f42c6...6f4eb6e7`](https://wirefluidscan.com/tx/0x147f42c6535ee0c242862b56a95f5ed8ca44b93dcee95bd278ddb2dd6f4eb6e7) |
| 251 | C13 Appr LQ | [`0x12015d0a...dee61608`](https://wirefluidscan.com/tx/0x12015d0a90b6a771df6e6beff9b74a61cbf54cd2fac7a111968e6e79dee61608) |
| 252 | C13 Sell LQ | [`0x524650ac...25755e5b`](https://wirefluidscan.com/tx/0x524650ac73fd38bfb209eff2612adb3fd77eb92811a2e0cd8943b01125755e5b) |
| 253 | C13 Appr MS | [`0x2c222be6...35217128`](https://wirefluidscan.com/tx/0x2c222be6ea43c5575657bc506ff19ed9bf3d8ea4ddaea06f678aaac435217128) |
| 254 | C13 Sell MS | [`0x93936915...40ff521f`](https://wirefluidscan.com/tx/0x93936915cbecedb8aff44cf04ef23dccdd1a3480cc63c18115c32f6240ff521f) |
| 255 | C13 Appr KK | [`0x012be068...74aaeda1`](https://wirefluidscan.com/tx/0x012be068112fb97c6772bdc1a90c3d6ac6c354aa5ccf64138e14d95d74aaeda1) |
| 256 | C13 Sell KK | [`0x9f358013...39a295bc`](https://wirefluidscan.com/tx/0x9f3580136763b770d97d561a24c134370197db5cad148217174b7a9539a295bc) |
| 257 | C13 Appr PZ | [`0x47674f92...12f0557b`](https://wirefluidscan.com/tx/0x47674f928a082da1f00d3bacf302122df084491f1f60c4f9d8f972fa12f0557b) |
| 258 | C13 Sell PZ | [`0x41c8f892...daa72433`](https://wirefluidscan.com/tx/0x41c8f892c679c10fcbd228a0e1c541a4cb9c594fa6d27c32179e472bdaa72433) |
| 259 | C13 Appr QG | [`0xba82fe3d...036c27d5`](https://wirefluidscan.com/tx/0xba82fe3d813185e5abce3cc26f4eea543179327ebb9920904193a531036c27d5) |
| 260 | C13 Sell QG | [`0x9a724e74...62b95c8e`](https://wirefluidscan.com/tx/0x9a724e74516a361b45a3ab4271c956f415569c328173803d035c944762b95c8e) |
| 261 | C13 Appr HK | [`0xa1e2c84c...1efbd8dc`](https://wirefluidscan.com/tx/0xa1e2c84cc992d61146b93d4a565070b2ec0c4b6d78f5f6306ac3d24b1efbd8dc) |
| 262 | C13 Sell HK | [`0xcacdae5c...4bbe1947`](https://wirefluidscan.com/tx/0xcacdae5ce19ab3dd28b3811c0603807249ca4054ff492e0676ced9854bbe1947) |
| 263 | C13 Appr RW | [`0x7c8aa0aa...de55267c`](https://wirefluidscan.com/tx/0x7c8aa0aa168842bb4a2ea58f085859040c836484274f2eaa11afc92dde55267c) |
| 264 | C13 Sell RW | [`0xda65ef6e...377a8e0c`](https://wirefluidscan.com/tx/0xda65ef6e75d51984a43996df75d7fb9bb7d52498b8bdb6056d8b0729377a8e0c) |
| 265 | C14 Buy LQ | [`0x634267b0...275bddb5`](https://wirefluidscan.com/tx/0x634267b0cf7017d15454e737003899c256dca3b06d279e5fb1dd87c5275bddb5) |
| 266 | C14 Buy MS | [`0x7f9b7793...4222e78e`](https://wirefluidscan.com/tx/0x7f9b77934f50aac2e7a0043169b9d082a8fe861ca7f3f94186eba54d4222e78e) |
| 267 | C14 Buy KK | [`0x66e30786...22633873`](https://wirefluidscan.com/tx/0x66e30786ef1de782a79dd5374d4f566f8cd91384edb31e5be1114d0a22633873) |
| 268 | C14 Buy PZ | [`0x790683c0...633192f7`](https://wirefluidscan.com/tx/0x790683c02934aa934367e6307e75f523ec6b1fcd5f8e27a55164c3bf633192f7) |
| 269 | C14 Buy QG | [`0xbeb5da6c...721767fd`](https://wirefluidscan.com/tx/0xbeb5da6cb622aa844a170ab42c83815cf8f3fd2287705c7a8131592b721767fd) |
| 270 | C14 Buy HK | [`0x0d8950ce...3b15a22f`](https://wirefluidscan.com/tx/0x0d8950ce83a5fe049ace0eeb1c517dd05511688a2409e13b809e534c3b15a22f) |
| 271 | C14 Buy RW | [`0xa6093275...81689a8e`](https://wirefluidscan.com/tx/0xa60932759c248477d7e942eca20430b25ff27b6ed0e3cdf02d8a23c581689a8e) |
| 272 | C14 Appr IU | [`0xf45065d1...7fcf4bcc`](https://wirefluidscan.com/tx/0xf45065d1e6ed954076fcae66f3fc4a62d873bb6855c28b189dbd29c07fcf4bcc) |
| 273 | C14 Appr LQ | [`0x8e01eab0...8a33b8c0`](https://wirefluidscan.com/tx/0x8e01eab004488e7dd74435a03550e983dcfd5afda2c83b9b4b9551d48a33b8c0) |
| 274 | C14 Sell LQ | [`0x5a46a2f6...2eb7b75c`](https://wirefluidscan.com/tx/0x5a46a2f67db174207b96b725a462e4add5407b1d1896581fa891d2862eb7b75c) |
| 275 | C14 Appr MS | [`0x2445cd80...73f4c168`](https://wirefluidscan.com/tx/0x2445cd8068f598f134d670439392d4862b207567556f443f9193211c73f4c168) |
| 276 | C14 Sell MS | [`0xef8a9ad3...4731cd89`](https://wirefluidscan.com/tx/0xef8a9ad3c9a87d027326fabb2de191e650c37fdf64d516d7f7dac1974731cd89) |
| 277 | C14 Appr KK | [`0xd00769d3...76f42a33`](https://wirefluidscan.com/tx/0xd00769d3e90ee29ef06854069071332b18f703df67ecbf2218dab91776f42a33) |
| 278 | C14 Sell KK | [`0xf879cb8f...0142801f`](https://wirefluidscan.com/tx/0xf879cb8f3496be45daf5fc41f20fb3d285adcc92ebd840d7d0d7c9de0142801f) |
| 279 | C14 Appr PZ | [`0x36d81b70...93b95a24`](https://wirefluidscan.com/tx/0x36d81b70a2508274fb3bad330bebbf294626668096661cef51a9d49493b95a24) |
| 280 | C14 Sell PZ | [`0xc932fbd5...5e799059`](https://wirefluidscan.com/tx/0xc932fbd5470e880e1d6c08dea0788729c82d30b5210711ea8c3e02405e799059) |
| 281 | C14 Appr QG | [`0xa68d8975...c3aad729`](https://wirefluidscan.com/tx/0xa68d8975f52d97d314db235f314284ed70d6cf632cfb2b18f81a01f0c3aad729) |
| 282 | C14 Sell QG | [`0x9305d2a2...e0e26259`](https://wirefluidscan.com/tx/0x9305d2a20daa7c47757d03af5ff75a2e1edcc4024f30c8e833cb98c0e0e26259) |
| 283 | C14 Appr HK | [`0x298ae0b4...87367b86`](https://wirefluidscan.com/tx/0x298ae0b4fd3b01d946485921e2f6e3d4e9fb410184e7ba08820bb53487367b86) |
| 284 | C14 Sell HK | [`0xc8379691...48ee44ca`](https://wirefluidscan.com/tx/0xc837969166782374cb9d36cb83367c499a858b42d8dadc7ae5a7176c48ee44ca) |
| 285 | C14 Appr RW | [`0xf77ebcc8...5504781e`](https://wirefluidscan.com/tx/0xf77ebcc843c86d4e9603c022ad022c3fa8dcdfada1fa06d72d949a8b5504781e) |
| 286 | C14 Sell RW | [`0x2b92bc0d...83839216`](https://wirefluidscan.com/tx/0x2b92bc0df9aaa84d8836b1716b2a9bc4b18652e6dd3cb47011e5791e83839216) |
| 287 | C15 Buy IU | [`0x00c3090e...c064ed69`](https://wirefluidscan.com/tx/0x00c3090ef138e5319ea08f4fbf4a11ad3fb3c1d86b153f3fa7a54a1fc064ed69) |
| 288 | C15 Buy LQ | [`0x24cd64f8...05198602`](https://wirefluidscan.com/tx/0x24cd64f873530383f288e862c8ebf6f87b65a142485405d892866be305198602) |
| 289 | C15 Buy MS | [`0xe4caa550...39cd688b`](https://wirefluidscan.com/tx/0xe4caa550c0f241a0e3c887227275a734f50e5145170b946e33efeb8c39cd688b) |
| 290 | C15 Buy KK | [`0x4c6829d2...fe350f9a`](https://wirefluidscan.com/tx/0x4c6829d25391572eed4ca25b54db603a8955f6cab868705cb44957e6fe350f9a) |
| 291 | C15 Buy PZ | [`0x72fe480f...6587846d`](https://wirefluidscan.com/tx/0x72fe480f607456e0057d34a751d17308da9bf371ee5bdc505ef4ff446587846d) |
| 292 | C15 Buy QG | [`0x420f832c...4ff55e75`](https://wirefluidscan.com/tx/0x420f832c307191f3e16bd145f7e24535647e5843768f625cc25b22844ff55e75) |
| 293 | C15 Buy HK | [`0xb0caf432...c06322d6`](https://wirefluidscan.com/tx/0xb0caf432b6ca0753b463d2d2baa735792af552214bfcc83cf2ee326dc06322d6) |
| 294 | C15 Buy RW | [`0xbf671347...94b8ebde`](https://wirefluidscan.com/tx/0xbf671347d2a1f5b59b540d3c679bd02d0556ad13d19aaa88d272906494b8ebde) |
| 295 | C15 Appr IU | [`0xb53ab430...bd130b78`](https://wirefluidscan.com/tx/0xb53ab430b979e18c942720ded81b6d6e0392b927038ef741bbec19e6bd130b78) |
| 296 | C15 Sell IU | [`0xdfe5ff78...bcd1f19b`](https://wirefluidscan.com/tx/0xdfe5ff78d8d56449e3852ab1ac0b4f4d33cb4727feb1fd125dca66acbcd1f19b) |
| 297 | C15 Appr LQ | [`0x4d52776c...5f64fb61`](https://wirefluidscan.com/tx/0x4d52776cdf1f73ccef00013f904ebd1f35b22ab53a5c4f3f433e68e65f64fb61) |
| 298 | C15 Sell LQ | [`0xa81991d0...344ac49a`](https://wirefluidscan.com/tx/0xa81991d02d296342dec8a02fdef5f34022081a0696b03755e843ac79344ac49a) |
| 299 | C15 Appr MS | [`0x21010d37...83827489`](https://wirefluidscan.com/tx/0x21010d370befd64065e03e7b1cc0f53455799fddb15ae52e86c9d13a83827489) |
| 300 | C15 Sell MS | [`0x2251ce1c...5f69e696`](https://wirefluidscan.com/tx/0x2251ce1ca6d6f843dcef2d38dd12b94a38f371e119db3159096776915f69e696) |
| 301 | C15 Appr KK | [`0x512a8b81...66c2bca2`](https://wirefluidscan.com/tx/0x512a8b813312e3dd620d342c3e4199c37458e48006a6dc7acddf348f66c2bca2) |
| 302 | C15 Sell KK | [`0x94ed55a4...61576344`](https://wirefluidscan.com/tx/0x94ed55a427deae094dd820a2fae140e096a9b3649490e3e062ddaabc61576344) |
| 303 | C15 Appr PZ | [`0x78f42776...889ac5ae`](https://wirefluidscan.com/tx/0x78f427768364bc5b69d199c138671db4a85c0d67f59a202ef7e0a327889ac5ae) |
| 304 | C15 Sell PZ | [`0x80e69fa4...f7c7d0a7`](https://wirefluidscan.com/tx/0x80e69fa40a6deda84a30cd6d065077fe756d276d170e0f0af206c6c1f7c7d0a7) |
| 305 | C15 Appr QG | [`0xf321b506...ffa723f6`](https://wirefluidscan.com/tx/0xf321b50679835516654566179f183255f5521af9d6319d3b1f92fc76ffa723f6) |
| 306 | C15 Sell QG | [`0x5f3b551b...c9947fd9`](https://wirefluidscan.com/tx/0x5f3b551b8e01fa42c9662fe8392a8c1ece4fe18c49698eb3c193f625c9947fd9) |
| 307 | C15 Appr HK | [`0xa6d7d06e...aa1aafe0`](https://wirefluidscan.com/tx/0xa6d7d06ee9a314724edb9790b11c60e7655fce4c24cdd668b3b07fa7aa1aafe0) |
| 308 | C15 Sell HK | [`0x19ff5884...8551d400`](https://wirefluidscan.com/tx/0x19ff5884b43325bf4e4c3b0bf4b6183e4de6799371bf51dc2e7f94a28551d400) |
| 309 | C15 Appr RW | [`0x04ff0bbe...dc6c002a`](https://wirefluidscan.com/tx/0x04ff0bbe5daaca8c448f80f9a1b007dd405bc88bafb6f09096d123f4dc6c002a) |
| 310 | C15 Sell RW | [`0x95d1c4bd...1116bc83`](https://wirefluidscan.com/tx/0x95d1c4bd20e7f7ac443504113f5c3367bde4b28c2fb4d39310e54ac41116bc83) |

</details>

---

## Summary

| Metric | Value |
|--------|-------|
| Total unique on-chain transactions | **867** |
| Contracts deployed | 6 |
| Team tokens created | 8 |
| WIRE spent (testing) | ~4.91 |
| Test runs | 4 |
| Overall pass rate | 92%+ |
