(function exposeInfinityResearch(global) {
  "use strict";

  const KG_KEY = "infinity.research.kg.v1";
  const HISTORY_KEY = "infinity.research.history.v1";
  const MAX_SOURCE_TEXT = 900;
  const MAX_CONTEXT = 6000;
  const SEED = {
    "research streams": {
      summary: "Each request can produce sourced Project Research plus an exploratory Infinity Discovery path.",
      confidence: 1,
      evidence: "USER_DEFINED",
      uses: 1
    },
    "evidence boundary": {
      summary: "Retrieved facts, model inference, and user-defined theory must remain visibly separate.",
      confidence: 1,
      evidence: "USER_DEFINED",
      uses: 1
    }
  };

  async function retrieve(query) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) return emptyResult(cleanQuery);

    const settled = await Promise.allSettled([
      searchWikipedia(cleanQuery),
      searchWikidata(cleanQuery),
      searchDuckDuckGo(cleanQuery)
    ]);
    const sources = settled.flatMap(result => result.status === "fulfilled" ? result.value : [])
      .filter(source => source.text)
      .slice(0, 7);
    const prior = relevantKnowledge(cleanQuery, 3);
    const context = buildContext(cleanQuery, sources, prior).slice(0, MAX_CONTEXT);
    remember(cleanQuery, sources, context);
    return {
      query: cleanQuery,
      context,
      sources,
      prior,
      evidenceState: sources.length ? "EXTERNALLY_VERIFIED" : prior.length ? "INFERRED" : "OBSERVED"
    };
  }

  async function searchWikipedia(query) {
    const url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(query) + "&format=json&origin=*&srlimit=3";
    const response = await fetchJson(url);
    return (response?.query?.search || []).map(item => ({
      provider: "Wikipedia",
      title: item.title,
      text: stripMarkup(item.snippet).slice(0, MAX_SOURCE_TEXT),
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(item.title.replace(/ /g, "_")),
      evidence: "EXTERNALLY_VERIFIED"
    }));
  }

  async function searchWikidata(query) {
    const url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" +
      encodeURIComponent(query) + "&language=en&format=json&origin=*&limit=3";
    const response = await fetchJson(url);
    return (response?.search || []).map(item => ({
      provider: "Wikidata",
      title: item.label,
      text: String(item.description || "").slice(0, MAX_SOURCE_TEXT),
      url: "https://www.wikidata.org/wiki/" + encodeURIComponent(item.id),
      evidence: "EXTERNALLY_VERIFIED"
    }));
  }

  async function searchDuckDuckGo(query) {
    const url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(query) +
      "&format=json&no_html=1&no_redirect=1&skip_disambig=0";
    const response = await fetchJson(url);
    const results = [];
    if (response?.AbstractText) results.push({
      provider: "DuckDuckGo",
      title: response.Heading || query,
      text: response.AbstractText.slice(0, MAX_SOURCE_TEXT),
      url: safeHttpUrl(response.AbstractURL) || "https://duckduckgo.com/?q=" + encodeURIComponent(query),
      evidence: "EXTERNALLY_VERIFIED"
    });
    flattenRelated(response?.RelatedTopics || []).slice(0, 2).forEach(item => results.push({
      provider: "DuckDuckGo",
      title: String(item.Text || query).split(" - ")[0].slice(0, 100),
      text: String(item.Text || "").slice(0, MAX_SOURCE_TEXT),
      url: safeHttpUrl(item.FirstURL) || "https://duckduckgo.com/?q=" + encodeURIComponent(query),
      evidence: "EXTERNALLY_VERIFIED"
    }));
    return results;
  }

  function buildContext(query, sources, prior) {
    const lines = [
      "RETRIEVED RESEARCH CONTEXT",
      `Query: ${query}`,
      "Evidence rule: Use these excerpts as leads, do not claim they prove more than they state. Clearly label inference and untested theory."
    ];
    if (sources.length) {
      lines.push("\nEXTERNALLY_VERIFIED SOURCE EXCERPTS:");
      sources.forEach((source, index) => lines.push(
        `[S${index + 1}] ${source.provider} — ${source.title}\n${source.text}\nURL: ${source.url}`
      ));
    } else {
      lines.push("\nNo live free-source excerpt was returned. Do not invent sources or citations.");
    }
    if (prior.length) {
      lines.push("\nLOCAL KNOWLEDGE GRAPH (prior session summaries; not independently verified):");
      prior.forEach((entry, index) => lines.push(`[K${index + 1}] ${entry.topic}: ${entry.summary}`));
    }
    return lines.join("\n\n");
  }

  function remember(query, sources, context) {
    const graph = load(KG_KEY, SEED);
    const key = normalize(query).slice(0, 80);
    const sourceSummary = sources.slice(0, 3).map(source => `${source.title}: ${source.text}`).join(" ");
    graph[key] = {
      summary: (sourceSummary || context).slice(0, 1200),
      confidence: Math.min(1, 0.4 + sources.length * 0.1),
      evidence: sources.length ? "EXTERNALLY_VERIFIED" : "INFERRED",
      sources: sources.map(source => source.url),
      uses: (graph[key]?.uses || 0) + 1,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(KG_KEY, JSON.stringify(graph));
    const history = load(HISTORY_KEY, []);
    history.push({ query, queryHash: hash(query), sourceUrls: sources.map(source => source.url), at: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)));
  }

  function relevantKnowledge(query, limit) {
    const queryWords = new Set(words(query));
    return Object.entries(load(KG_KEY, SEED)).map(([topic, value]) => {
      const score = words(topic + " " + value.summary).filter(word => queryWords.has(word)).length;
      return { topic, summary: value.summary, evidence: value.evidence, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Research source returned HTTP ${response.status}`);
    return response.json();
  }
  function flattenRelated(items) { return items.flatMap(item => Array.isArray(item.Topics) ? flattenRelated(item.Topics) : [item]); }
  function stripMarkup(value) { const node = document.createElement("textarea"); node.innerHTML = String(value || "").replace(/<[^>]*>/g, " "); return node.value.replace(/\s+/g, " ").trim(); }
  function safeHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
  function words(value) { return normalize(value).split(" ").filter(word => word.length > 2); }
  function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function hash(value) { let out = 2166136261; for (const char of String(value)) { out ^= char.charCodeAt(0); out = Math.imul(out, 16777619); } return (out >>> 0).toString(16); }
  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? structuredClone(fallback); } catch { return structuredClone(fallback); } }
  function emptyResult(query) { return { query, context: "", sources: [], prior: [], evidenceState: "OBSERVED" }; }

  global.InfinityResearch = { retrieve, relevantKnowledge };
})(window);
