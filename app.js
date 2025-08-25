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
    // Add cache-busting parameter to ensure fresh data
    const cacheBreaker = Date.now();
    fetch(`./data/products.json?v=${cacheBreaker}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(`Loaded ${data.products?.length || 0} products from ${data.source || 'unknown source'}`);
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
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--sage-green) 100%)',
          boxShadow: '0 4px 20px rgba(45, 80, 22, 0.3)'
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                backgroundColor: 'var(--warm-orange)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mr: 2,
                boxShadow: '0 2px 8px rgba(210, 105, 30, 0.3)'
              }}
            >
              <span className="material-icons" style={{ color: 'white', fontSize: '24px' }}>pets</span>
            </Box>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: 'white' }}>
              VetFoodRx
            </Typography>
          </Box>
          <Tooltip title="Compare selected products">
            <IconButton
              sx={{ 
                color: 'white',
                backgroundColor: compareItems.length > 0 ? 'var(--warm-orange)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'var(--terracotta)'
                },
                transition: 'all 0.3s ease'
              }}
              disabled={compareItems.length === 0}
              onClick={toggleCompare}
            >
              <span className="material-icons">compare</span>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4, flexGrow: 1 }}>
        {/* Filter section */}
        <Box
          component="section"
          sx={{
            mb: 4,
            p: 3,
            backgroundColor: 'var(--soft-white)',
            borderRadius: 3,
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--light-beige)',
            '&:hover': {
              boxShadow: 'var(--hover-shadow)',
              transform: 'translateY(-2px)',
              transition: 'all 0.3s ease'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <span className="material-icons" style={{ color: 'var(--sage-green)', marginRight: '8px', fontSize: '28px' }}>filter_list</span>
            <Typography variant="h5" sx={{ color: 'var(--primary-green)', fontWeight: 600 }}>
              Find the Perfect Diet
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="medium">
                <InputLabel 
                  sx={{ 
                    color: 'var(--sage-green)',
                    '&.Mui-focused': { color: 'var(--primary-green)' }
                  }}
                >
                  Species
                </InputLabel>
                <Select
                  value={speciesFilter}
                  label="Species"
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--light-beige)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--sage-green)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--primary-green)'
                    }
                  }}
                >
                  <MenuItem value="">Any Species</MenuItem>
                  <MenuItem value="dog">🐕 Dog</MenuItem>
                  <MenuItem value="cat">🐱 Cat</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="medium">
                <InputLabel 
                  sx={{ 
                    color: 'var(--sage-green)',
                    '&.Mui-focused': { color: 'var(--primary-green)' }
                  }}
                >
                  Brand
                </InputLabel>
                <Select
                  value={brandFilter}
                  label="Brand"
                  onChange={(e) => setBrandFilter(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--light-beige)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--sage-green)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--primary-green)'
                    }
                  }}
                >
                  <MenuItem value="">Any Brand</MenuItem>
                  {brands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="medium">
                <InputLabel 
                  sx={{ 
                    color: 'var(--sage-green)',
                    '&.Mui-focused': { color: 'var(--primary-green)' }
                  }}
                >
                  Health Conditions
                </InputLabel>
                <Select
                  multiple
                  value={conditionsFilter}
                  onChange={(e) => setConditionsFilter(e.target.value)}
                  input={<OutlinedInput label="Health Conditions" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.slice(0, 2).map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'var(--sage-green)', 
                            color: 'white',
                            fontSize: '0.7rem'
                          }} 
                        />
                      ))}
                      {selected.length > 2 && (
                        <Chip 
                          label={`+${selected.length - 2} more`} 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'var(--warm-orange)', 
                            color: 'white',
                            fontSize: '0.7rem'
                          }} 
                        />
                      )}
                    </Box>
                  )}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--light-beige)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--sage-green)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--primary-green)'
                    }
                  }}
                >
                  {ALL_CONDITIONS.map((cond) => (
                    <MenuItem key={cond} value={cond}>
                      <Checkbox
                        checked={conditionsFilter.indexOf(cond) > -1}
                        sx={{
                          color: 'var(--sage-green)',
                          '&.Mui-checked': {
                            color: 'var(--primary-green)'
                          }
                        }}
                      />
                      <ListItemText 
                        primary={cond} 
                        sx={{ 
                          '& .MuiTypography-root': { 
                            textTransform: 'capitalize',
                            color: 'var(--dark-brown)'
                          } 
                        }} 
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Search Products"
                value={searchTerm}
                size="medium"
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <span className="material-icons" style={{ color: 'var(--sage-green)', marginRight: '8px' }}>search</span>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'var(--light-beige)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--sage-green)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--primary-green)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: 'var(--sage-green)'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'var(--primary-green)'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Products grid */}
        <Grid container spacing={3}>
          {filtered.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 6, backgroundColor: 'var(--soft-white)', borderRadius: 3, boxShadow: 'var(--card-shadow)' }}>
                <span className="material-icons" style={{ fontSize: '72px', color: 'var(--sage-green)', marginBottom: '16px', display: 'block' }}>search_off</span>
                <Typography variant="h5" sx={{ color: 'var(--primary-green)', mb: 2, fontWeight: 600 }}>
                  No products found
                </Typography>
                <Typography variant="body1" sx={{ color: 'var(--dark-brown)', mb: 2 }}>
                  Try adjusting your filters or search terms to find the perfect diet for your pet.
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--sage-green)' }}>
                  Our veterinary nutritionists have carefully curated these prescription diets to help manage various health conditions.
                </Typography>
              </Box>
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
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: 'var(--soft-white)',
              boxShadow: 'var(--hover-shadow)'
            }
          }}
        >
          <DialogTitle 
            sx={{ 
              backgroundColor: 'var(--primary-green)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center',
              py: 2
            }}
          >
            <span className="material-icons" style={{ marginRight: '12px', fontSize: '28px' }}>compare_arrows</span>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Product Comparison
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 3, backgroundColor: 'var(--light-beige)' }}>
            {compareItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <span className="material-icons" style={{ fontSize: '64px', color: 'var(--sage-green)', marginBottom: '16px', display: 'block' }}>compare</span>
                <Typography variant="h6" sx={{ color: 'var(--primary-green)', mb: 1 }}>
                  No products selected for comparison
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--dark-brown)' }}>
                  Select products using the "Compare" button to see a side-by-side comparison
                </Typography>
              </Box>
            ) : (
              <Table size="medium" sx={{ backgroundColor: 'var(--soft-white)', borderRadius: 2, overflow: 'hidden' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--primary-green)' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>Feature</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                        {item.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Brand */}
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: 'var(--cream)' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--primary-green)' }}>Brand</TableCell>
                    {compareItems.map((item) => (
                      <TableCell key={item.id} align="center" sx={{ color: 'var(--dark-brown)' }}>
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
      
      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          backgroundColor: 'var(--primary-green)', 
          color: 'white', 
          py: 3, 
          mt: 'auto',
          background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--sage-green) 100%)'
        }}
      >
        <Container>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    backgroundColor: 'var(--warm-orange)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    mr: 2
                  }}
                >
                  <span className="material-icons" style={{ color: 'white', fontSize: '20px' }}>pets</span>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  VetFoodRx
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Professional veterinary diet finder to help manage your pet's health conditions. 
                Always consult with your veterinarian before changing your pet's diet.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  Trusted by veterinarians and pet owners
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                  <Chip 
                    label="Hill's Prescription Diet" 
                    size="small" 
                    sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                  <Chip 
                    label="Royal Canin" 
                    size="small" 
                    sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                  <Chip 
                    label="Purina Pro Plan" 
                    size="small" 
                    sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              © 2024 VetFoodRx. Prices are estimates and may vary. Always verify with retailers and consult your veterinarian.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

// Card component to display an individual product
function ProductCard({ product, selected, onToggle }) {
  const [imageError, setImageError] = useState(false);
  
  // Create a fallback image based on product type and species
  const getFallbackImage = () => {
    const species = product.species === 'both' ? 'pet' : product.species;
    const type = product.type || 'dry';
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="160" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="160" fill="#F5E6D3"/>
        <circle cx="100" cy="60" r="25" fill="#87A96B"/>
        <text x="100" y="66" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">
          ${species === 'dog' ? '🐕' : species === 'cat' ? '🐱' : '🐾'}
        </text>
        <text x="100" y="90" text-anchor="middle" fill="#3C2415" font-family="Arial" font-size="12">
          ${product.brand.split(' ')[0]}
        </text>
        <text x="100" y="110" text-anchor="middle" fill="#2D5016" font-family="Arial" font-size="10">
          ${type.toUpperCase()} FOOD
        </text>
        <text x="100" y="130" text-anchor="middle" fill="#87A96B" font-family="Arial" font-size="9">
          ${species.toUpperCase()}
        </text>
      </svg>
    `)}`;
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'var(--soft-white)',
        borderRadius: 3,
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--light-beige)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 'var(--hover-shadow)',
          transform: 'translateY(-4px)',
          borderColor: 'var(--sage-green)'
        }
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
        <CardMedia
          component="img"
          height="180"
          image={imageError ? getFallbackImage() : product.image}
          alt={product.name}
          onError={() => setImageError(true)}
          sx={{ 
            objectFit: 'contain', 
            backgroundColor: 'var(--light-beige)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        />
        {product.type && (
          <Chip 
            label={product.type.toUpperCase()} 
            size="small" 
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              backgroundColor: 'var(--warm-orange)', 
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem'
            }} 
          />
        )}
      </Box>
      
      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'var(--sage-green)', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {product.brand}
          </Typography>
        </Box>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700, 
            color: 'var(--primary-green)', 
            mb: 1.5,
            lineHeight: 1.3
          }}
        >
          {product.name}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <span className="material-icons" style={{ color: 'var(--terracotta)', marginRight: '6px', fontSize: '18px' }}>
            {product.species === 'dog' ? 'pets' : product.species === 'cat' ? 'pets' : 'favorite'}
          </span>
          <Typography variant="body2" sx={{ color: 'var(--dark-brown)', fontWeight: 500 }}>
            {product.species === 'both' ? 'Dog & Cat' : product.species.charAt(0).toUpperCase() + product.species.slice(1)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {product.targetedConditions.slice(0, 3).map((cond) => (
            <Chip 
              key={cond} 
              label={cond} 
              size="small" 
              sx={{ 
                backgroundColor: 'var(--cream)', 
                color: 'var(--primary-green)',
                fontSize: '0.7rem',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'var(--sage-green)',
                  color: 'white'
                }
              }} 
            />
          ))}
          {product.targetedConditions.length > 3 && (
            <Chip 
              label={`+${product.targetedConditions.length - 3} more`} 
              size="small" 
              sx={{ 
                backgroundColor: 'var(--light-beige)', 
                color: 'var(--dark-brown)',
                fontSize: '0.7rem'
              }} 
            />
          )}
        </Box>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'var(--dark-brown)', 
            mb: 2,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {product.features[0]}
        </Typography>
        
        {product.price && (
          <Box sx={{ mt: 'auto' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'var(--warm-orange)', 
                fontWeight: 700,
                mb: 0.5
              }}
            >
              {product.price.average 
                ? `$${product.price.average.toFixed(2)}`
                : product.price.estimate 
                ? `~$${product.price.estimate.toFixed(2)}`
                : product.price.range || 'Price varies'
              }
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--sage-green)', fontWeight: 500 }}>
              Estimated pricing
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2.5, pb: 2.5 }}>
        <Button
          size="medium"
          variant="outlined"
          component="a"
          href={product.link}
          target="_blank"
          sx={{
            borderColor: 'var(--sage-green)',
            color: 'var(--sage-green)',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'var(--sage-green)',
              color: 'white',
              borderColor: 'var(--sage-green)'
            }
          }}
        >
          View Details
        </Button>
        <Button
          size="medium"
          variant={selected ? 'contained' : 'outlined'}
          onClick={onToggle}
          sx={{
            backgroundColor: selected ? 'var(--warm-orange)' : 'transparent',
            borderColor: 'var(--warm-orange)',
            color: selected ? 'white' : 'var(--warm-orange)',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'var(--terracotta)',
              borderColor: 'var(--terracotta)',
              color: 'white'
            }
          }}
        >
          {selected ? 'Remove' : 'Compare'}
        </Button>
      </CardActions>
    </Card>
  );
}

// Render the application
ReactDOM.createRoot(document.getElementById('root')).render(<App />);