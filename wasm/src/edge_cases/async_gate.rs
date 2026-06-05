pub const ASYNC_NIGHT_CYCLE_TAG: &str = "async-night-cycle";

pub const ASYNC_NIGHT_WARNING: &str =
    "Asynchronous Time-Gate: Requires Plains of Eidolon Night Cycle";

pub fn async_night_cycle_warning(source_tags: &[String]) -> Option<&'static str> {
    if source_tags.iter().any(|t| t == ASYNC_NIGHT_CYCLE_TAG) {
        Some(ASYNC_NIGHT_WARNING)
    } else {
        None
    }
}
