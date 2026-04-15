"""
Overflow AI Engine — ChromaDB Vector Store.

Manages three ChromaDB collections (matches, innings, players) for the RAG
pipeline.  Supports both sentence-transformers embeddings (local, free) and
a fallback default embedding function.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings

from config import CHROMADB_DIR, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

COLLECTION_NAMES = ("matches", "innings", "players")

# Maximum batch size for ChromaDB upserts (avoids memory issues)
_BATCH_SIZE = 500


def _get_embedding_function() -> Any:
    """Return a ChromaDB-compatible embedding function.

    Tries sentence-transformers first, falls back to ChromaDB's built-in
    default embedding function.
    """
    try:
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        ef = SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL)
        logger.info("Using SentenceTransformer embeddings: %s", EMBEDDING_MODEL)
        return ef
    except Exception as exc:
        logger.warning(
            "SentenceTransformer unavailable (%s), using ChromaDB default embeddings.", exc
        )
        try:
            from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
            return DefaultEmbeddingFunction()
        except Exception:
            logger.warning("DefaultEmbeddingFunction unavailable, using None (ChromaDB will use its built-in).")
            return None


class VectorStore:
    """Thin wrapper around ChromaDB for Overflow PSL data."""

    def __init__(self, persist_dir: Path | str | None = None) -> None:
        persist_dir = Path(persist_dir) if persist_dir else CHROMADB_DIR
        persist_dir.mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=Settings(anonymized_telemetry=False),
        )
        self._ef = _get_embedding_function()
        self._collections: dict[str, chromadb.Collection] = {}

        for name in COLLECTION_NAMES:
            # Try with custom embedding function first; fall back to no-ef
            # if the collection was created with a different embedding function
            try:
                kwargs: dict[str, Any] = {"name": name}
                if self._ef is not None:
                    kwargs["embedding_function"] = self._ef
                self._collections[name] = self._client.get_or_create_collection(**kwargs)
            except ValueError:
                # Embedding function conflict — collection exists with different ef
                logger.warning("Embedding conflict for %s, opening without custom ef", name)
                self._collections[name] = self._client.get_or_create_collection(name=name)

        logger.info(
            "VectorStore initialised at %s with collections: %s",
            persist_dir,
            ", ".join(f"{n} ({self._collections[n].count()})" for n in COLLECTION_NAMES),
        )

    # ── public API ─────────────────────────────────────────────────────

    @property
    def client(self) -> chromadb.ClientAPI:
        return self._client

    def collection(self, name: str) -> chromadb.Collection:
        """Return a collection by name."""
        return self._collections[name]

    def upsert_documents(
        self,
        collection_name: str,
        documents: list[dict[str, Any]],
    ) -> int:
        """Upsert a list of document dicts into the named collection.

        Each document dict must contain ``id``, ``text``, and ``metadata``.
        Returns the number of documents upserted.
        """
        coll = self._collections[collection_name]
        total = len(documents)

        for start in range(0, total, _BATCH_SIZE):
            batch = documents[start : start + _BATCH_SIZE]
            ids = [d["id"] for d in batch]
            texts = [d["text"] for d in batch]
            metadatas = [d["metadata"] for d in batch]
            # Sanitise metadata: ChromaDB only accepts str/int/float/bool
            sanitised = [_sanitise_metadata(m) for m in metadatas]
            coll.upsert(ids=ids, documents=texts, metadatas=sanitised)

        logger.info("Upserted %d docs into '%s' (total now %d).", total, collection_name, coll.count())
        return total

    def query(
        self,
        collection_name: str,
        query_text: str,
        n_results: int = 5,
        where: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Query a collection and return ranked results.

        Returns a list of dicts with ``id``, ``text``, ``metadata``, ``distance``.
        """
        coll = self._collections[collection_name]
        if coll.count() == 0:
            logger.warning("Collection '%s' is empty — returning [].", collection_name)
            return []

        kwargs: dict[str, Any] = {
            "query_texts": [query_text],
            "n_results": min(n_results, coll.count()),
        }
        if where:
            kwargs["where"] = where

        try:
            results = coll.query(**kwargs)
        except Exception as exc:
            logger.error("ChromaDB query failed: %s", exc)
            return []

        docs: list[dict[str, Any]] = []
        if results and results["ids"]:
            for i, doc_id in enumerate(results["ids"][0]):
                docs.append({
                    "id": doc_id,
                    "text": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0.0,
                })
        return docs

    def multi_query(
        self,
        query_text: str,
        n_results_per_collection: int = 3,
        collections: list[str] | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """Query multiple collections and return combined results."""
        target = collections or list(COLLECTION_NAMES)
        return {
            name: self.query(name, query_text, n_results=n_results_per_collection)
            for name in target
            if name in self._collections
        }

    def ingest_all(self, data: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
        """Bulk ingest the output of ``data.ingest.ingest_all()``.

        ``data`` must have keys matching collection names.
        """
        counts: dict[str, int] = {}
        for name in COLLECTION_NAMES:
            docs = data.get(name, [])
            if docs:
                counts[name] = self.upsert_documents(name, docs)
            else:
                counts[name] = 0
        return counts

    def stats(self) -> dict[str, int]:
        """Return document counts per collection."""
        return {name: self._collections[name].count() for name in COLLECTION_NAMES}

    def is_populated(self) -> bool:
        """True if all collections have at least one document."""
        return all(self._collections[n].count() > 0 for n in COLLECTION_NAMES)


def _sanitise_metadata(meta: dict[str, Any]) -> dict[str, str | int | float | bool]:
    """Convert metadata values to types accepted by ChromaDB."""
    clean: dict[str, str | int | float | bool] = {}
    for k, v in meta.items():
        if isinstance(v, (str, int, float, bool)):
            clean[k] = v
        elif isinstance(v, (list, tuple, set)):
            clean[k] = ", ".join(str(x) for x in v)
        elif v is None:
            clean[k] = ""
        else:
            clean[k] = str(v)
    return clean


# ── CLI entry ─────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    vs = VectorStore()
    print("Stats:", vs.stats())

    if "--ingest" in sys.argv:
        from data.ingest import ingest_all, generate_demo_data

        use_demo = "--demo" in sys.argv
        data = generate_demo_data() if use_demo else ingest_all()
        counts = vs.ingest_all(data)
        print("Ingested:", counts)

    if "--query" in sys.argv:
        q = " ".join(sys.argv[sys.argv.index("--query") + 1 :])
        if q:
            results = vs.multi_query(q)
            for coll, docs in results.items():
                print(f"\n--- {coll} ---")
                for d in docs:
                    print(f"  [{d['distance']:.4f}] {d['text'][:150]}...")
