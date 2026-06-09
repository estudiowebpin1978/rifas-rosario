export async function clonarProducto(supabase, producto) {
  const { data: nuevoProducto, error } = await supabase
    .from('productos')
    .insert([{
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      imagen: producto.imagen,
      categoria_id: producto.categoria_id,
      telefono: producto.telefono || '5493412500029',
      finalizado: false,
      images: producto.images,
      title: producto.title,
      image: producto.image,
      price: producto.price || 0,
      raffle_price: producto.raffle_price,
      numbers_total: producto.numbers_total || 100,
      precio: producto.precio,
    }])
    .select('id')
    .single();

  if (error) throw new Error('Error al clonar producto: ' + error.message);

  const total = producto.numbers_total || 100;
  const boletosInsert = [];
  for (let i = 1; i <= total; i++) {
    boletosInsert.push({ numero: i, producto_id: nuevoProducto.id, estado: 'disponible' });
  }

  const { error: bolError } = await supabase
    .from('boletos')
    .insert(boletosInsert);

  if (bolError) throw new Error('Error al crear boletos: ' + bolError.message);

  return nuevoProducto;
}
