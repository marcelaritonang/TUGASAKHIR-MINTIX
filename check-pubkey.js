const { PublicKey } = require('@solana/web3.js');

const pubkeyString = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU";
const pubkey = new PublicKey(pubkeyString);
const bytes = pubkey.toBytes();

console.log(`Pubkey string: ${pubkeyString}`);
console.log(`Bytes: [${bytes.join(', ')}]`);
console.log(`\nFormat untuk Rust:`);
console.log(`const ADMIN_PUBKEY: [u8; 32] = [
    ${bytes.join(', ')}
];`);