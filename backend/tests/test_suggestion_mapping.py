from app.schemas.document import NormalizedDocument, NormalizedSection, NormalizedParagraph
from app.document.location_mapper import LocationMappingEngine

def test_location_mapping_exact_and_fuzzy():
    p1 = NormalizedParagraph(
        paragraph_id="p_10",
        index=1,
        full_text="Developed web microservices using Python and Flask.",
        text_hash="hash123",
    )
    sec = NormalizedSection(
        section_id="sec_exp",
        heading_text="EXPERIENCE",
        paragraphs=[p1],
    )
    doc = NormalizedDocument(
        document_id="doc_test",
        filename="test.docx",
        mime_type="docx",
        sections=[sec],
    )

    # Exact substring
    loc, conf = LocationMappingEngine.find_location(doc, "using Python and Flask")
    assert conf == 1.0
    assert loc.paragraph_id == "p_10"
    assert loc.start_offset > 0

    # Fuzzy match
    loc_fuz, conf_fuz = LocationMappingEngine.find_location(doc, "Developed web microservices using Python")
    assert conf_fuz >= 0.8
    assert loc_fuz.paragraph_id == "p_10"
