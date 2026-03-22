export default function MdCategoryBadge({ category }) {
  if (!category) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
        미분류
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${category.color}20`,
        color: category.color,
      }}
    >
      {category.icon && <span className="mr-1">{category.icon}</span>}
      {category.name}
    </span>
  );
}
