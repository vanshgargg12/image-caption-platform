import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanCaption } from "../src/model/postprocess.js";

describe("cleanCaption post-processor", () => {
  it("trims leading and trailing whitespace", () => {
    assert.equal(cleanCaption("   a dog on a rug   "), "A dog on a rug");
  });

  it("collapses multiple consecutive whitespace characters into a single space", () => {
    assert.equal(
      cleanCaption("a   cat  \t\n  on   the   mat"),
      "A cat on the mat"
    );
  });

  it("collapses immediately repeated words ('dog dog' becomes 'dog')", () => {
    assert.equal(cleanCaption("dog dog"), "Dog");
    assert.equal(cleanCaption("the the cat"), "The cat");
  });

  it("collapses multiple repeated instances of a word ('cat cat cat' becomes 'cat')", () => {
    assert.equal(cleanCaption("cat cat cat"), "Cat");
  });

  it("collapses immediately repeated words within a longer sentence", () => {
    assert.equal(
      cleanCaption("a dog dog on the green grass"),
      "A dog on the green grass"
    );
  });

  it("collapses immediately repeated multi-word phrases", () => {
    assert.equal(
      cleanCaption("a dog in the park in the park"),
      "A dog in the park"
    );
    assert.equal(
      cleanCaption("a cat on a mat a cat on a mat"),
      "A cat on a mat"
    );
  });

  it("collapses repeated phrases with punctuation preserved cleanly", () => {
    assert.equal(
      cleanCaption("running in the field, running in the field."),
      "Running in the field."
    );
  });

  it("capitalizes the first letter of the cleaned caption", () => {
    assert.equal(cleanCaption("a golden retriever puppy"), "A golden retriever puppy");
  });

  it("preserves already capitalized sentences", () => {
    assert.equal(
      cleanCaption("A black cat sitting on a windowsill"),
      "A black cat sitting on a windowsill"
    );
  });

  it("ensures no trailing partial word ending with a hyphen", () => {
    assert.equal(
      cleanCaption("a dog running on the gra-"),
      "A dog running on the"
    );
    assert.equal(
      cleanCaption("a dog play-"),
      "A dog"
    );
  });

  it("ensures no trailing isolated hyphen or dangling punctuation", () => {
    assert.equal(cleanCaption("a dog playing with a ball -"), "A dog playing with a ball");
    assert.equal(cleanCaption("a dog playing with a ball,"), "A dog playing with a ball");
    assert.equal(cleanCaption("a dog playing with a ball;"), "A dog playing with a ball");
  });

  it("ensures no trailing orphan consonant from truncated generation", () => {
    assert.equal(
      cleanCaption("a dog running across the grass w"),
      "A dog running across the grass"
    );
    assert.equal(
      cleanCaption("a cat on a couch b"),
      "A cat on a couch"
    );
  });

  it("preserves valid single-letter words 'a' and 'I'", () => {
    assert.equal(cleanCaption("a dog sitting on a"), "A dog sitting on a");
    assert.equal(cleanCaption("a puppy and I"), "A puppy and I");
  });

  it("removes trailing ellipsis or incomplete contractions", () => {
    assert.equal(cleanCaption("a dog running..."), "A dog running");
    assert.equal(cleanCaption("a dog that didn'"), "A dog that");
  });

  it("returns an empty string for empty, whitespace-only, or non-string inputs", () => {
    assert.equal(cleanCaption(""), "");
    assert.equal(cleanCaption("   "), "");
    assert.equal(cleanCaption(null), "");
    assert.equal(cleanCaption(undefined), "");
  });
});
