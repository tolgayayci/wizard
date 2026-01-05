#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(feature = "export-abi")]
fn main() {
    merkle_proofs_openzeppelin::print_from_args();
}

#[cfg(not(any(test, feature = "export-abi")))]
fn main() {}
