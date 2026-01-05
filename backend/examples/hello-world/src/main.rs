#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(feature = "export-abi")]
fn main() {
    hello_world::print_from_args();
}

#[cfg(not(any(test, feature = "export-abi")))]
fn main() {}
