defmodule Pirates.GameChannel do
  use Phoenix.Channel
  alias Pirates.GameServer.Manager
  alias Pirates.GameServer.Instance
  
  def join("game:" <> name, _params, socket) do
    server = Manager.get_or_create_instance(name)
    {:ok, table} = Instance.register(server)

    id = System.unique_integer([:positive])
    socket = socket
        |> assign(:table, table)
        |> assign(:id, Integer.to_string(id))
    {:ok, socket}
  end

  def handle_in("player_state", state, socket) do
    # full_state = parse_state_struct(state)
    full_state = Map.put(state, :id, socket.assigns.id)
    Instance.update_state(socket.assigns.table, full_state)
    {:noreply, socket}
  end

  # def handle_info({:state_tick, state}, socket) do
  #   # filter out the client's state from the map
  #   other_state = Enum.reject state, fn %{id: id} ->
  #     socket.assigns.id == id
  #   end
  #   broadcast_from socket, "state_tick", %{state: other_state}
  #   {:noreply, socket}
  # end

  intercept ["state_tick"]
  def handle_out("state_tick", %{state: states}, socket) do
    other_state = Enum.reject states, fn %{id: id} ->
      socket.assigns.id == id
    end
    push socket, "state_tick", %{state: other_state}
    {:noreply, socket}
  end

  # # socket msg's come in as maps with String keys, but Structs require atom keys
  # defp parse_state_struct(attrs) do
  #   struct = struct(State)
  #   Enum.reduce Map.to_list(struct), struct, fn {k, _}, acc ->
  #     case Map.fetch(attrs, Atom.to_string(k)) do
  #       {:ok, v} -> %{acc | k => v}
  #       :error -> acc
  #     end
  #   end
  # end

  # def handle_in("new_chatmsg", %{"body" => body}, socket) do
  #   broadcast! socket, "new_chatmsg", %{body: body, user: socket.assigns.id}
  #   {:noreply, socket}
  # end
end
