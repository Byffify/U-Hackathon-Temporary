-- Run after `python -m alembic upgrade head`. Safe to run again.
-- Editorial previews are not purchasable project listings.
INSERT INTO explore_examples
    (id, title, type, stack, price_wei, creator_name, description, tone, features, sort_order)
VALUES
    (
        'flora', 'Flora storefront', 'E-commerce', 'React', '500000000000000000',
        'Maya Chen',
        'A quiet little storefront for things that grow. Product browsing, search, and a considered cart experience.',
        'aqua', '["Product search", "Shopping cart", "Product cards"]'::json, 1
    ),
    (
        'orbit', 'Orbit dashboard', 'Dashboard', 'Next.js', '800000000000000000',
        'Leo Park',
        'An easy-to-read workspace for the numbers that matter. Charts, project activity, and a flexible dashboard layout.',
        'lilac', '["Analytics charts", "Activity feed", "Dashboard layout"]'::json, 2
    ),
    (
        'folio', 'Studio portfolio', 'Portfolio', 'Vue', '300000000000000000',
        'Aria Patel',
        'An expressive home for independent work. A project gallery, editorial case studies, and a simple contact page.',
        'peach', '["Project gallery", "Case studies", "Contact page"]'::json, 3
    )
ON CONFLICT (id) DO NOTHING;
