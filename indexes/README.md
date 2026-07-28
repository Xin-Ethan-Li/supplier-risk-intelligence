# Retrieval artifacts

The versioned `.joblib` artifact contains the fictional corpus chunks, TF-IDF vectorizer, deterministic LSA projection, L2-normalized dense embeddings and BM25 corpus statistics. Only artifacts created by this repository should be loaded because `joblib` uses Python pickle serialization.

Rebuild and verify through the root scripts rather than editing artifacts manually.
