from typing import NotRequired, TypedDict, Optional, Dict, Union, Literal

class LinkedUser(TypedDict):
    """Type definition for a linked user."""
    email: NotRequired[str]
    phone: NotRequired[str]
    userId: NotRequired[int]

class TransactionApproval(TypedDict):
    """Type definition for a transaction approval."""
    signer: str
    signature: Optional[str]

class BaseKeypairSigner(TypedDict):
    """Base type for keypair-based signers."""
    type: Literal["solana-keypair", "evm-keypair"]  # Add all possible values
    secretKey: str

class BaseFireblocksSigner(TypedDict):
    """Base type for Fireblocks-based signers."""
    type: Literal["solana-fireblocks-custodial", "evm-fireblocks-custodial"]  # Add all possible values

class BaseWalletConfig(TypedDict):
    """Base configuration for any wallet type."""
    adminSigner: Union[BaseKeypairSigner, BaseFireblocksSigner]

class BaseWalletOptions(TypedDict):
    """Base options for any wallet type."""
    config: BaseWalletConfig
    linkedUser: Optional[LinkedUser] 