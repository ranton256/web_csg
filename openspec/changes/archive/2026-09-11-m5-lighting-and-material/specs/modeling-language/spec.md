## REMOVED Requirements

### Requirement: Lights and materials are not supported yet
**Reason**: M5 delivers the `light` and `material` blocks. No construct in the language is "not supported yet" any more.
**Migration**: The `lighting-and-shading` requirements "Declared lights", "Light validation", "Material color", and "Material validation" cover these blocks. Errors in their property expressions are still reported, through the shared property-block rules.
