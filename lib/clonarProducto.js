export async function clonarProducto(supabase, producto) {
  const orgId = producto.organization_id;
  if (orgId) {
    const { data: org } = await supabase
      .from('organizaciones')
      .select('plan')
      .eq('id', orgId)
      .single();

    const plan = org?.plan || 'gratis';
    const limits = { gratis: 3, pro: 10, business: 999 };

    const { count } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('finalizado', false);

    if ((count || 0) >= (limits[plan] || 3)) {
      return null;
    }
  }

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
      title: producto.title || producto.nombre || '',
      image: producto.image || producto.imagen || null,
      price: producto.price || 0,
      raffle_price: producto.raffle_price || 0,
      numbers_total: producto.numbers_total || 100,
      precio: producto.precio,
      organization_id: producto.organization_id || null,
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
