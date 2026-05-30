---
category: server
tags: [server, performance, serialization, rsc]
---

## Avoid Duplicate Serialization in RSC Props

**Impact: LOW**

Data passed as props across the RSC→Client boundary is serialized to JSON and embedded in the HTML payload. Passing the same large object multiple times as separate props inflates the payload. Deduplicate or restructure to minimize bytes sent.

**Bad: Same data serialized multiple times**

```typescript
export async function ProductPage({ id }: { id: string }) {
  const product = await getProduct(id);

  return (
    <>
      <ProductHeader product={product} />
      <ProductDetails product={product} />
      <ProductActions product={product} />
    </>
  );
}
```

**Good: Pass only what each component needs**

```typescript
export async function ProductPage({ id }: { id: string }) {
  const product = await getProduct(id);

  return (
    <>
      <ProductHeader name={product.name} imageUrl={product.imageUrl} />
      <ProductDetails description={product.description} specs={product.specs} />
      <ProductActions productId={product.id} price={product.price} />
    </>
  );
}
```
