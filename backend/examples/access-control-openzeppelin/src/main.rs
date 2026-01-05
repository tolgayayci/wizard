#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(feature = "export-abi")]
fn main() {
    access_control_openzeppelin::print_from_args();
}

#[cfg(not(any(test, feature = "export-abi")))]
fn main() {}
