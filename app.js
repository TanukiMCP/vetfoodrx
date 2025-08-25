/*
  VetFoodRx Application

  This file defines a single‑page React application for browsing veterinary
  prescription diets. Users can filter diets by species, brand and a
  combination of targeted disease conditions. Results are displayed as
  responsive cards that summarise key features, bag sizes, pricing estimates
  and targeted conditions. A comparison drawer allows users to select up to
  three products and view them side by side. The app fetches its data
  from a local JSON file (./data/products.json) with pricing data updated
  via scheduled scraping from multiple retailers including 1800PetMeds and Wag.
  The app registers a service worker for offline caching.

  React, ReactDOM and Material UI are loaded from CDNs in index.html.
*/

const { useState, useEffect } = React;
const {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Tooltip
} = MaterialUI;

// List of possible conditions supported by the application. When adding
// new products to data/products.json be sure to include relevant
// conditions here so that they appear in the filter.
const ALL_CONDITIONS = [
  'kidney disease',
  'urinary',
  'digestive',
  'diabetes',
  'weight management',
  'hepatic',
  'joint',
  'skin & food sensitivities',
  'allergies',
  'dental',
  'critical care',
  'hyperthyroidism',
  'mobility',
  'pancreatitis'
];

// Available brands. This list will populate automatically based on
// products loaded from the JSON.

function App() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [conditionsFilter, setConditionsFilter] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [compareItems, setCompareItems] = useState([]);
  const [isCompareOpen, setCompareOpen] = useState(false);

  // Load product data from local JSON on mount
  useEffect(() => {
    fetch('./data/products.json')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch((err) => console.error('Error loading product data', err));
  }, []);

  // Update filtered list whenever filters or products change
  useEffect(() => {
    let list = products;
    // Filter by species if selected; treat 'both' as matching any
    if (speciesFilter) {
      list = list.filter(
        (p) => p.species === speciesFilter || p.species === 'both'
      );
    }
    // Filter by brand
    if (brandFilter) {
      list = list.filter((p) => p.brand === brandFilter);
    }
    // Filter by selected conditions (AND logic)
    if (conditionsFilter.length > 0) {
      list = list.filter((p) =>
        conditionsFilter.every((cond) => p.targetedConditions.includes(cond))
      );
    }
    // Search by product name (case‑insensitive)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(term));
    }
    setFiltered(list);
  }, [speciesFilter, brandFilter, conditionsFilter, searchTerm, products]);

  // Derive list of brands from loaded products for filter options
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();

  // Toggle compare dialog open or closed
  const toggleCompare = () => setCompareOpen((open) => !open);

  // Add or remove an item from comparison list
  function handleCompareToggle(product) {
    setCompareItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      // Limit comparison to three items
      if (prev.length >= 3) return prev;
      return [...prev, product];
    });
  }

  return (
    <Box>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VetFoodRx
          </Typography>
          <Tooltip title="Compare selected products">
            <IconButton
              color="inherit"
              disabled={compareItems.length === 0}
              onClick={toggleCompare}
            >
              <span className="material-icons">compare</span>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 2 }}>
        {/* Filter section */}
        <Box
          component="section"
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: '#fff',
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Filter products
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Species</InputLabel>
                <Select
                  value={speciesFilter}
                  label="Species"
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="dog">Dog</MenuItem>
                  <MenuItem value="cat">Cat</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Brand</InputLabel>
                <Select
                  value={brandFilter}
                  label="Brand"
                  onChange={(e) => setBrandFilter(e.target.value)}
                >
                  <MenuItem value="">Any</MenuItem>
                  {brands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Conditions</InputLabel>
                <Select
                  multiple
                  value={conditionsFilter}
                  onChange={(e) => setConditionsFilter(e.target.value)}
                  input={<OutlinedInput label="Conditions" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {ALL_CONDITIONS.map((cond) => (
                    <MenuItem key={cond} value={cond}>
                      <Checkbox
                        checked={conditionsFilter.indexOf(cond) > -1}
                      />
                      <ListItemText primary={cond} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Search"
                value={searchTerm}
                size="small"
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        {/* Products grid */}
        <Grid container spacing={2}>
          {filtered.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1">
                No products match the selected criteria.
              </Typography>
            </Grid>
          )}
          {filtered.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <ProductCard
                product={product}
                selected={compareItems.find((item) => item.id === product.id)}
                onToggle={() => handleCompareToggle(product)}
              />
            </Grid>
          ))}
        </Grid>
        {/* Comparison dialog */}
        <Dialog
          open={isCompareOpen}
          onClose={toggleCompare}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Compare Products</DialogTitle>
          <DialogContent>
            {compareItems.length === 0 ? (
              <Typography>No products selected for comparison.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center">
                        {item.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Brand */}
                  <TableRow>
                    <TableCell>Brand</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center">
                        {item.brand}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Species */}
                  <TableRow>
                    <TableCell>Species</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center">
                        {item.species}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Conditions */}
                  <TableRow>
                    <TableCell>Conditions</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center">
                        {item.targetedConditions.join(', ')}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Bag sizes */}
                  <TableRow>
                    <TableCell>Bag sizes</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center">
                        {item.bagSizes.join(', ')}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Price (show estimated price) */}
                  <TableRow>
                    <TableCell>Price* (approx.)</TableCell>
                    {compareItems.map((item) => {
                      const price = item.price;
                      let displayPrice = 'N/A';
                      
                      if (price) {
                        if (price.average) {
                          displayPrice = `$${price.average.toFixed(2)}`;
                        } else if (price.estimate) {
                          displayPrice = `$${price.estimate.toFixed(2)}`;
                        } else if (price.range) {
                          displayPrice = price.range;
                        }
                      }
                      
                      return (
                        <TableCell key={item.id} align="center">
                          {displayPrice}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {/* Features */}
                  <TableRow>
                    <TableCell>Key features</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="left">
                        <ul style={{ paddingLeft: '16px', margin: 0 }}>
                          {item.features.slice(0, 3).map((feat, idx) => (
                            <li key={idx} style={{ fontSize: '0.8rem' }}>{feat}</li>
                          ))}
                        </ul>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            )}
            <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
              *Prices are estimates based on available data from multiple retailers
              and may vary by location and current promotions. Always check with
              your veterinarian and preferred retailer for current pricing.
            </Typography>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}

// Card component to display an individual product
function ProductCard({ product, selected, onToggle }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="160"
        image={product.image}
        alt={product.name}
        sx={{ objectFit: 'contain', backgroundColor: '#f5f5f5' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {product.brand}
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {product.species === 'both' ? 'Dog & Cat' : product.species.charAt(0).toUpperCase() + product.species.slice(1)}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {product.targetedConditions.slice(0, 4).map((cond) => (
            <Chip key={cond} label={cond} size="small" />
          ))}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {product.features[0]}
        </Typography>
        {product.price && (
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="body2" color="primary" fontWeight="bold">
              {product.price.average 
                ? `$${product.price.average.toFixed(2)} avg.`
                : product.price.estimate 
                ? `~$${product.price.estimate.toFixed(2)}`
                : product.price.range || 'Price varies'
              }
            </Typography>
            {product.price.note && (
              <Typography variant="caption" color="text.secondary">
                Est. pricing
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          component="a"
          href={product.link}
          target="_blank"
        >
          View
        </Button>
        <Button
          size="small"
          variant={selected ? 'contained' : 'outlined'}
          color={selected ? 'secondary' : 'primary'}
          onClick={onToggle}
        >
          {selected ? 'Remove' : 'Compare'}
        </Button>
      </CardActions>
    </Card>
  );
}

// Render the application
ReactDOM.createRoot(document.getElementById('root')).render(<App />);