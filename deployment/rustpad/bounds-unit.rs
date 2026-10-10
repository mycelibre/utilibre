
#[cfg(test)]
mod utilibre_bounds {
    use super::*;
    #[test]
    fn utf8_document_limit_preserves_last_accepted_text() {
        let pad = Rustpad::default();
        let mut op = OperationSeq::default();
        op.insert("fictional");
        pad.apply_edit(0, 0, op).unwrap();
        let mut oversized = OperationSeq::default();
        oversized.delete(9);
        oversized.insert(&"🙂".repeat(65537));
        assert!(pad.apply_edit(0, 1, oversized).is_err());
        assert_eq!(pad.text(), "fictional");
    }
    #[test]
    fn operation_ceiling_preserves_document() {
        let pad = Rustpad::default();
        for revision in 0..4096 {
            let mut op = OperationSeq::default();
            if revision > 0 { op.delete(1); }
            op.insert("x");
            pad.apply_edit(0, revision, op).unwrap();
        }
        let mut op = OperationSeq::default();
        op.delete(1); op.insert("y");
        assert!(pad.apply_edit(0, 4096, op).is_err());
        assert_eq!(pad.text(), "x");
    }
    #[test]
    fn history_byte_ceiling_preserves_document() {
        let pad = Rustpad::default();
        for revision in 0..3 {
            let mut op = OperationSeq::default();
            if revision > 0 { op.delete(256 * 1024); }
            op.insert(&"x".repeat(256 * 1024));
            pad.apply_edit(0, revision, op).unwrap();
        }
        let mut op = OperationSeq::default();
        op.delete(256 * 1024); op.insert(&"y".repeat(256 * 1024));
        assert!(pad.apply_edit(0, 3, op).is_err());
        assert_eq!(pad.text(), "x".repeat(256 * 1024));
    }
}
