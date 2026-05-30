---
category: server
tags: [server, performance, serialization, rsc]
---

## Minimize Serialization at RSC Boundaries

**Impact: HIGH**

Data crossing the RSC→Client Component boundary is serialized to JSON and embedded in the page HTML. Large objects, deeply nested structures, or unnecessary fields inflate the initial payload and slow time-to-interactive. Trim props to only what client components actually need.

**Bad: Passing entire database object to client**

```typescript
export async function ProductPage({ id }: { id: string }) {
  const product = await db.product.findUnique({
    where: { id },
    include: { reviews: true, variants: true, seller: true },
  });

  // Serializes entire object including unused fields
  return <AddToCartButton product={product} />;
}
```

**Good: Pass only required fields to client components**

```typescript
export async function ProductPage({ id }: { id: string }) {
  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, name: true, price: true, inStock: true },
  });

  return (
    <AddToCartButton
      productId={product.id}
      name={product.name}
      price={product.price}
      inStock={product.inStock}
    />
  );
}
```
