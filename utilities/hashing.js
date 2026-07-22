import { compare, hash } from "bcryptjs";
import { createHmac } from "crypto";

const doHash = (value, saltValue) => {
    return hash(value, saltValue);
};

export default doHash;

export function decryptHashedPassword(value, hashedValue) {
    return compare(value, hashedValue);
}

export function hmacProcess(value, key) {
    return createHmac('sha256', key).update(value).digest('hex');
}
